// Pure rules for check-in/out, overdue flags, reminders and condition comparison (no DB).

export const CHECK_IN_EARLY_MINUTES = 15;
export const REMINDER_LEAD_MINUTES = 60;

export type ConditionRating = "GOOD" | "MINOR_ISSUES" | "DAMAGED";

export const CONDITION_LABELS: Record<ConditionRating, string> = {
  GOOD: "Good, as expected",
  MINOR_ISSUES: "Minor issues or wear",
  DAMAGED: "Damaged",
};

const SEVERITY: Record<ConditionRating, number> = { GOOD: 0, MINOR_ISSUES: 1, DAMAGED: 2 };

/** Compares the return condition with the pick-up condition. */
export function conditionChange(before: ConditionRating, after: ConditionRating) {
  const diff = SEVERITY[after] - SEVERITY[before];
  return diff > 0 ? "worse" : diff < 0 ? "better" : "same";
}

/**
 * Check-in is open from a few minutes before the start until the window ends.
 * `demo` lifts the early limit so a live demo doesn't have to wait for a slot to begin.
 */
export function checkInState(
  b: { status: string; startsAt: Date; endsAt: Date },
  now: Date,
  demo = false,
): { allowed: boolean; reason?: string } {
  if (b.status !== "APPROVED") {
    return { allowed: false, reason: "Only approved bookings can be checked in" };
  }
  if (now >= b.endsAt) {
    return { allowed: false, reason: "This booking's time window has already ended" };
  }
  const opensAt = b.startsAt.getTime() - CHECK_IN_EARLY_MINUTES * 60_000;
  if (!demo && now.getTime() < opensAt) {
    const mins = Math.ceil((opensAt - now.getTime()) / 60_000);
    return { allowed: false, reason: `Check-in opens ${CHECK_IN_EARLY_MINUTES} minutes before the start (in about ${mins} min)` };
  }
  return { allowed: true };
}

export function checkOutState(b: { status: string }): { allowed: boolean; reason?: string } {
  return b.status === "CHECKED_IN"
    ? { allowed: true }
    : { allowed: false, reason: "Only a booking that is checked in can be checked out" };
}

/** In use past the end of the booked window with no check-out yet. */
export function isOverdue(b: { status: string; endsAt: Date }, now: Date) {
  return b.status === "CHECKED_IN" && b.endsAt < now;
}

export function lateMinutes(endsAt: Date, returnedAt: Date) {
  return Math.max(0, Math.round((returnedAt.getTime() - endsAt.getTime()) / 60_000));
}

/** An approved booking about to start that hasn't had its reminder yet. */
export function reminderDue(
  b: { status: string; startsAt: Date; reminderSentAt: Date | null },
  now: Date,
) {
  if (b.status !== "APPROVED" || b.reminderSentAt) return false;
  const until = b.startsAt.getTime() - now.getTime();
  return until > 0 && until <= REMINDER_LEAD_MINUTES * 60_000;
}

export function formatLate(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
