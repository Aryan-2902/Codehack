// Fair-usage rules: no one hogs a resource. Pure (no DB) so the rules are explainable and testable.
// Every failing rule names itself, so a requester always sees which rule produced the outcome.
import { formatInstant, instantToLocal, localToInstant } from "@/lib/format";
import type { Check } from "@/lib/eligibility";

export const FAIR_USAGE = {
  /** Bookings that are pending, approved or in use, across all resources. */
  maxActiveBookings: 3,
  /** Bookings of one resource in the same Monday-to-Sunday week. */
  maxPerResourcePerWeek: 2,
  /** After cancelling an approved booking, or missing one, before re-requesting that resource. */
  cooldownHours: 24,
} as const;

export const FAIR_USAGE_SUMMARY = [
  `At most ${FAIR_USAGE.maxActiveBookings} active bookings at once (pending, approved or in use).`,
  `At most ${FAIR_USAGE.maxPerResourcePerWeek} bookings of the same resource in one week.`,
  `Cancelling an approved booking, or missing it, pauses requests for that resource for ${FAIR_USAGE.cooldownHours} hours.`,
  "Waitlists are first come, first served.",
];

/** The Monday-00:00 to next-Monday-00:00 campus-local week containing a date ("YYYY-MM-DD"). */
export function weekBounds(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const mondayMs = Date.parse(`${date}T00:00:00Z`) - ((day + 6) % 7) * 86_400_000;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return {
    start: localToInstant(iso(mondayMs), 0),
    end: localToInstant(iso(mondayMs + 7 * 86_400_000), 0),
  };
}

export const cooldownEndsAt = (from: Date) =>
  new Date(from.getTime() + FAIR_USAGE.cooldownHours * 3_600_000);

export type UsageContext = {
  /** The user's pending/approved/in-use bookings across every resource. */
  activeTotal: number;
  /** Their bookings of this resource in the requested week. */
  weekCount: number;
  /** An active cooldown on this resource, if any. */
  cooldown: { until: Date; reason: "cancelled" | "no_show" } | null;
};

export function fairUsageChecks(usage: UsageContext, now: Date): Check[] {
  const checks: Check[] = [
    {
      key: "fair_active",
      label: "Within your overall booking limit",
      ok: usage.activeTotal < FAIR_USAGE.maxActiveBookings,
      message: `Fair-usage rule: at most ${FAIR_USAGE.maxActiveBookings} active bookings at once (you have ${usage.activeTotal}). Finish or cancel one first.`,
    },
    {
      key: "fair_week",
      label: "Within the weekly limit for this resource",
      ok: usage.weekCount < FAIR_USAGE.maxPerResourcePerWeek,
      message: `Fair-usage rule: at most ${FAIR_USAGE.maxPerResourcePerWeek} bookings of the same resource per week (you already have ${usage.weekCount} that week).`,
    },
  ];
  if (usage.cooldown && usage.cooldown.until > now) {
    checks.push({
      key: "fair_cooldown",
      label: "Not in a cooldown for this resource",
      ok: false,
      message: `Fair-usage rule: you ${
        usage.cooldown.reason === "no_show" ? "missed a booking" : "cancelled an approved booking"
      } for this resource recently, so you can request it again after ${formatInstant(usage.cooldown.until)}.`,
    });
  }
  return checks;
}

/** Explains a no-show to the person who missed the slot. */
export function noShowReason(until: Date) {
  return `Marked as a no-show: the booking ended without a check-in. Fair-usage rule: you can request this resource again after ${formatInstant(until)}.`;
}

export { instantToLocal };
