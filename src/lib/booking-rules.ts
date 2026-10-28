// Pure booking rules (no DB) so they can be unit-tested and run identically on submit.
// evaluateBooking returns every check that applies, passed or failed, plus non-blocking warnings.
import {
  DAY_NAMES,
  formatLocalDate,
  localToInstant,
  minuteToTime,
} from "@/lib/format";
import {
  eligibilityChecks,
  type Check,
  type EligibilityResource,
  type EligibilityUser,
} from "@/lib/eligibility";

export type BookingWindow = {
  startDate: string; // campus-local YYYY-MM-DD
  startMinute: number;
  endDate: string;
  endMinute: number;
};

export type BookingResource = EligibilityResource & {
  ownerId: string;
  status: string;
  maxBookingHours: number;
  maxConcurrentBookings: number;
  requiresSupervision: boolean;
  depositRequired: boolean;
  depositAmount: number | null;
  slots: { dayOfWeek: number; startMinute: number; endMinute: number }[];
  blackouts: { date: Date; reason: string | null }[];
};

export type Evaluation = { ok: boolean; checks: Check[]; warnings: string[] };

export function windowInstants(w: BookingWindow) {
  return {
    startsAt: localToInstant(w.startDate, w.startMinute),
    endsAt: localToInstant(w.endDate, w.endMinute),
  };
}

const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

function hoursOn(slots: BookingResource["slots"], date: string) {
  const day = weekday(date);
  const todays = slots.filter((s) => s.dayOfWeek === day);
  const text = todays.length
    ? todays.map((s) => `${minuteToTime(s.startMinute)}–${minuteToTime(s.endMinute)}`).join(", ")
    : null;
  return { day, todays, text };
}

export function evaluateBooking(args: {
  user: EligibilityUser & { id: string };
  resource: BookingResource;
  hasGrant: boolean;
  window: BookingWindow;
  /** The user's other active (pending/approved/checked-in) requests for this resource. */
  activeCount: number;
  /** An approved booking already overlaps the window. */
  hasConflict: boolean;
  now?: Date;
}): Evaluation {
  const { user, resource, window, now = new Date() } = args;
  const checks: Check[] = [];
  const warnings: string[] = [];

  checks.push({
    key: "status",
    label: "Resource is open for booking",
    ok: resource.status === "ACTIVE",
    message:
      resource.status === "MAINTENANCE"
        ? "This resource is under maintenance"
        : "This resource is no longer available",
  });
  if (resource.ownerId === user.id) {
    checks.push({
      key: "owner",
      label: "Not your own resource",
      ok: false,
      message: "You can't book a resource you own",
    });
  }
  checks.push(...eligibilityChecks(user, resource, args.hasGrant));

  const { startsAt, endsAt } = windowInstants(window);
  if (endsAt <= startsAt) {
    checks.push({
      key: "order",
      label: "Valid time range",
      ok: false,
      message: "The end must be after the start",
    });
    return { ok: false, checks, warnings };
  }

  checks.push({
    key: "future",
    label: "Starts in the future",
    ok: startsAt > now,
    message: "Choose a start time that hasn't passed yet",
  });

  const closed = [...new Set([window.startDate, window.endDate])]
    .map((d) => ({ d, b: resource.blackouts.find((b) => b.date.toISOString().slice(0, 10) === d) }))
    .find((x) => x.b);
  checks.push({
    key: "blackout",
    label: "Resource is open on your dates",
    ok: !closed,
    message: closed
      ? `Closed on ${formatLocalDate(closed.d)}${closed.b?.reason ? ` (${closed.b.reason})` : ""}`
      : undefined,
  });

  // Same-day bookings must sit inside one open slot. Multi-day bookings (e.g. a camera kit)
  // need pick-up during opening hours on the first day and return during them on the last.
  const sameDay = window.startDate === window.endDate;
  const start = hoursOn(resource.slots, window.startDate);
  const end = hoursOn(resource.slots, window.endDate);
  let hoursOk: boolean;
  let hoursMessage: string | undefined;
  if (sameDay) {
    hoursOk = start.todays.some(
      (s) => s.startMinute <= window.startMinute && s.endMinute >= window.endMinute,
    );
    hoursMessage = start.text
      ? `Outside opening hours (${DAY_NAMES[start.day]}: ${start.text})`
      : `Not open on ${DAY_NAMES[start.day]}s`;
  } else {
    const pickUp = start.todays.some(
      (s) => s.startMinute <= window.startMinute && window.startMinute < s.endMinute,
    );
    const dropOff = end.todays.some(
      (s) => s.startMinute < window.endMinute && window.endMinute <= s.endMinute,
    );
    hoursOk = pickUp && dropOff;
    hoursMessage = !pickUp
      ? start.text
        ? `Pick-up must be during opening hours (${DAY_NAMES[start.day]}: ${start.text})`
        : `Not open for pick-up on ${DAY_NAMES[start.day]}s`
      : end.text
        ? `Return must be during opening hours (${DAY_NAMES[end.day]}: ${end.text})`
        : `Not open for return on ${DAY_NAMES[end.day]}s`;
  }
  checks.push({
    key: "hours",
    label: "Within opening hours",
    ok: hoursOk,
    message: hoursOk ? undefined : hoursMessage,
  });

  const hours = (endsAt.getTime() - startsAt.getTime()) / 3_600_000;
  checks.push({
    key: "duration",
    label: `Within the ${resource.maxBookingHours} h maximum`,
    ok: hours <= resource.maxBookingHours,
    message: `Bookings are limited to ${resource.maxBookingHours} h (yours is ${Number(hours.toFixed(1))} h)`,
  });

  checks.push({
    key: "limit",
    label: "Within your booking limit",
    ok: args.activeCount < resource.maxConcurrentBookings,
    message: `You already have ${args.activeCount} active request${
      args.activeCount === 1 ? "" : "s"
    } for this resource (limit ${resource.maxConcurrentBookings})`,
  });

  if (args.hasConflict) {
    warnings.push(
      "This slot already has an approved booking. You can still request it; the reviewer may waitlist you.",
    );
  }
  if (resource.requiresSupervision) {
    warnings.push("A supervisor must be present while you use this resource.");
  }
  if (resource.depositRequired && resource.depositAmount) {
    warnings.push(`A refundable deposit of ₹${resource.depositAmount} is due at pick-up.`);
  }

  return { ok: checks.every((c) => c.ok), checks, warnings };
}
