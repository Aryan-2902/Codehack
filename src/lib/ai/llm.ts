import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// AI suggestions are behind a feature flag and a credential. With either missing, the app
// uses its built-in keyword/template suggestions instead, and nothing leaves the server.
export const DEFAULT_MODEL = "claude-opus-5-5";

export function aiEnabled() {
  return (
    process.env.AI_FEATURES === "true" &&
    Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
  );
}

const aiModel = () => process.env.AI_MODEL || DEFAULT_MODEL;

export type AiErrorCode = "disabled" | "refused" | "truncated" | "empty" | "invalid" | "api";

/** Why an AI call produced nothing usable. The message is for server logs, never for users. */
export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

let client: Anthropic | undefined;
function getClient() {
  // Credentials come from the environment. A short timeout and a single retry keep a slow
  // provider from stalling the page; the caller falls back to the built-in suggestions.
  client ??= new Anthropic({ timeout: Number(process.env.AI_TIMEOUT_MS) || 20_000, maxRetries: 1 });
  return client;
}

/**
 * Asks Claude for one JSON object matching `schema` and returns it after `parse` has checked
 * it. Structured outputs guarantee valid JSON of the right shape; `parse` is the second,
 * stricter line of defence for anything the schema can't express.
 */
export async function askJson<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  parse: (raw: unknown) => T;
  maxTokens?: number;
}): Promise<{ result: T; model: string }> {
  if (!aiEnabled()) throw new AiError("disabled", "AI features are not enabled");

  const model = aiModel();
  // Server-side fallback re-runs a safety-declined request on another model; Haiku has none.
  const fallback = model.startsWith("claude-haiku")
    ? {}
    : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

  let response;
  try {
    response = await getClient().beta.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      ...fallback,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      // Short structured answers don't need deep reasoning.
      output_config: { effort: "low", format: { type: "json_schema", schema: opts.schema } },
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) throw new AiError("api", `Anthropic API error ${e.status ?? "connection"}`);
    throw new AiError("api", e instanceof Error ? e.name : "unknown error");
  }

  // A safety decline arrives as a normal 200; check before reading content.
  if (response.stop_reason === "refusal") throw new AiError("refused", "The model declined the request");
  if (response.stop_reason === "max_tokens") throw new AiError("truncated", "The answer was cut off");

  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text" || !text.text.trim()) throw new AiError("empty", "No text in the response");

  let raw: unknown;
  try {
    raw = JSON.parse(text.text);
  } catch {
    throw new AiError("invalid", "The answer was not valid JSON");
  }
  try {
    return { result: opts.parse(raw), model: response.model };
  } catch {
    throw new AiError("invalid", "The answer did not match the expected shape");
  }
}
