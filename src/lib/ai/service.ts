import "server-only";
import { db } from "@/lib/db";
import { ApiError, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkEligibility } from "@/lib/eligibility";
import { conditionChange, lateMinutes } from "@/lib/checkin-rules";
import { CATEGORY_LABELS, formatWindow } from "@/lib/format";
import { clearKey, isBlocked, recordHit } from "@/lib/rate-limit";
import { AiError, aiEnabled, askJson } from "@/lib/ai/llm";
import {
  MATCH_SCHEMA,
  MATCH_SYSTEM,
  basicMatch,
  buildMatchPrompt,
  matchOutput,
  pickSuggestions,
  requirementsOf,
  type RawSuggestion,
} from "@/lib/ai/match-logic";
import {
  SUMMARY_SCHEMA,
  SUMMARY_SYSTEM,
  basicSummary,
  buildSummaryPrompt,
  summaryOutput,
  type IncidentFacts,
} from "@/lib/ai/summary-logic";

export type AiMode = "ai" | "basic";

const FALLBACK_NOTE = "The AI service wasn't available, so this is a basic, rule-based result.";

// Model calls cost money, so each person gets a modest allowance per feature.
const AI_MAX_PER_WINDOW = 15;
const AI_WINDOW_MS = 10 * 60_000;

function spend(userId: string, feature: string) {
  const key = `ai:${feature}:${userId}`;
  const lock = isBlocked(key, AI_MAX_PER_WINDOW);
  if (lock.blocked) {
    throw new ApiError(429, `You've used a lot of suggestions. Try again in ${Math.ceil(lock.retryAfterSec / 60)} minute(s).`, {
      "Retry-After": String(lock.retryAfterSec),
    });
  }
  recordHit(key, AI_WINDOW_MS);
}

/** Test hook: lets a test start from a clean allowance. */
export const resetAiAllowance = (userId: string, feature: string) => clearKey(`ai:${feature}:${userId}`);

// ---------------------------------------------------------------- resource matching

export async function suggestResources(user: CurrentUser, need: string) {
  spend(user.id, "match");

  // The catalog is what this person could actually book: open listings that aren't their own.
  const [resources, grants] = await Promise.all([
    db.resource.findMany({
      where: { status: "ACTIVE", ownerId: { not: user.id } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.eligibilityGrant.findMany({ where: { userId: user.id }, select: { resourceId: true } }),
  ]);
  const catalog = resources.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    location: r.location,
    description: r.description,
    requirements: requirementsOf(r),
  }));
  const granted = new Set(grants.map((g) => g.resourceId));

  let mode: AiMode = "basic";
  let note: string | undefined;
  let picked: RawSuggestion[];

  if (aiEnabled()) {
    try {
      const { result } = await askJson({
        system: MATCH_SYSTEM,
        user: buildMatchPrompt(need, catalog),
        schema: MATCH_SCHEMA,
        parse: (raw) => matchOutput.parse(raw),
      });
      picked = pickSuggestions(result, new Set(catalog.map((c) => c.id)));
      // A model that named only resources that don't exist is treated as a failed call.
      if (result.suggestions.length > 0 && picked.length === 0) throw new AiError("invalid", "No valid ids");
      mode = "ai";
    } catch (e) {
      console.error("[ai] resource matching failed:", e instanceof AiError ? e.code : e);
      picked = basicMatch(need, catalog);
      note = FALLBACK_NOTE;
    }
  } else {
    picked = basicMatch(need, catalog);
  }

  const byId = new Map(resources.map((r) => [r.id, r]));
  const suggestions = picked.map((p) => {
    const r = byId.get(p.id)!;
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      location: r.location,
      description: r.description.slice(0, 160),
      reason: p.reason,
      eligibility: checkEligibility(user, r, granted.has(r.id)),
    };
  });

  await audit({
    actorId: user.id,
    action: "ai.match_suggested",
    targetType: "User",
    targetId: user.id,
    metadata: { mode, count: suggestions.length },
  });
  return { mode, note, suggestions };
}

// ---------------------------------------------------------------- incident summaries

export async function summariseIncident(user: CurrentUser, incidentId: string) {
  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    include: {
      booking: {
        include: {
          resource: { select: { name: true, category: true, ownerId: true } },
          conditionReports: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!incident) throw new ApiError(404, "Incident not found");
  spend(user.id, "incident");

  const { booking } = incident;
  const latest = (stage: "CHECK_IN" | "CHECK_OUT") =>
    [...booking.conditionReports].reverse().find((r) => r.stage === stage);
  const pickup = latest("CHECK_IN");
  const returned = latest("CHECK_OUT");
  const now = new Date();
  const stillOut = booking.status === "CHECKED_IN" && booking.endsAt < now;

  const facts: IncidentFacts = {
    type: incident.type,
    reportedBy:
      incident.reportedBy === booking.requesterId
        ? "the borrower"
        : incident.reportedBy === booking.resource.ownerId
          ? "the resource owner"
          : "staff",
    description: incident.description,
    resource: booking.resource.name,
    category: CATEGORY_LABELS[booking.resource.category] ?? booking.resource.category,
    window: formatWindow(booking.startsAt, booking.endsAt),
    photosAttached: incident.photos.length,
    pickup: pickup ? { condition: pickup.condition, notes: pickup.notes } : null,
    returned: returned ? { condition: returned.condition, notes: returned.notes } : null,
    conditionChange: pickup && returned ? conditionChange(pickup.condition, returned.condition) : null,
    lateMinutes: booking.checkedOutAt
      ? lateMinutes(booking.endsAt, booking.checkedOutAt)
      : stillOut
        ? lateMinutes(booking.endsAt, now)
        : null,
    stillOut,
  };

  let mode: AiMode = "basic";
  let note: string | undefined;
  let summary = basicSummary(facts);

  if (aiEnabled()) {
    try {
      const { result } = await askJson({
        system: SUMMARY_SYSTEM,
        user: buildSummaryPrompt(facts),
        schema: SUMMARY_SCHEMA,
        parse: (raw) => summaryOutput.parse(raw),
      });
      if (!result.summary) throw new AiError("invalid", "Empty summary");
      summary = result;
      mode = "ai";
    } catch (e) {
      console.error("[ai] incident summary failed:", e instanceof AiError ? e.code : e);
      note = FALLBACK_NOTE;
    }
  }

  await audit({
    actorId: user.id,
    action: "ai.incident_summarised",
    targetType: "Incident",
    targetId: incidentId,
    metadata: { mode },
  });
  return { mode, note, ...summary };
}
