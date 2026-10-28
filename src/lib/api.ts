import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ApiError } from "@/lib/auth";

/** Parse a JSON body against a zod schema; throws ApiError(400) with a readable message. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  const result = schema.safeParse(json);
  if (!result.success) throw new ApiError(400, firstIssue(result.error));
  return result.data;
}

function firstIssue(error: ZodError) {
  const issue = error.issues[0];
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** Wrap a Route Handler so ApiError becomes a JSON error and anything else a 500. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      console.error(e);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
