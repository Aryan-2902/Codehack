// Pure approval/waitlist rules (no DB) so they can be unit-tested.

type Span = { startsAt: Date; endsAt: Date };
type Reviewable = {
  ownerId: string;
  requiresSupervision: boolean;
  depositRequired: boolean;
};

export const overlaps = (a: Span, b: Span) => a.startsAt < b.endsAt && a.endsAt > b.startsAt;

/** Supervised or deposit-backed resources are costly/specialised, so a manager decides on them. */
export function needsManager(r: Pick<Reviewable, "requiresSupervision" | "depositRequired">) {
  return r.requiresSupervision || r.depositRequired;
}

/** Who may see a request in their review queue. */
export function canSeeInQueue(user: { id: string; role: string }, r: Reviewable) {
  if (user.role === "ADMIN" || user.role === "MANAGER") return true;
  return user.role === "OWNER" && r.ownerId === user.id;
}

/** Who may approve, reject, waitlist or cancel. Owners can't decide on manager-only resources. */
export function canDecide(user: { id: string; role: string }, r: Reviewable) {
  if (user.role === "ADMIN" || user.role === "MANAGER") return true;
  return user.role === "OWNER" && r.ownerId === user.id && !needsManager(r);
}

type Waiting = Span & { id: string; createdAt: Date };

/**
 * When a slot frees up, who gets it? The waitlist is first come, first served (by request time),
 * and each promotion occupies its window so later overlapping requests stay waitlisted.
 * Requests whose start has already passed are skipped.
 */
export function pickPromotions(waitlisted: Waiting[], occupied: Span[], now: Date): string[] {
  const queue = [...waitlisted].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
  );
  const taken = [...occupied];
  const promoted: string[] = [];
  for (const w of queue) {
    if (w.startsAt <= now) continue;
    if (taken.some((o) => overlaps(o, w))) continue;
    promoted.push(w.id);
    taken.push(w);
  }
  return promoted;
}

export const MIN_REASON_LENGTH = 5;

export function waitlistReason(position: number, note?: string) {
  const base = `Waitlisted: this slot is already booked by an approved request. The waitlist is first come, first served, and you are #${position}.`;
  return note ? `${base} ${note}` : base;
}

export const PROMOTED_REASON =
  "Promoted from the waitlist: an approved booking was cancelled and you were next in line (first come, first served).";
