import "server-only";
import { db } from "@/lib/db";
import { ApiError, type CurrentUser } from "@/lib/auth";
import { evaluateBooking, windowInstants, type BookingWindow } from "@/lib/booking-rules";
import { instantToLocal, minuteToTime, timeToMinute } from "@/lib/format";
import { canViewResource } from "@/lib/resources";

/** Requests that occupy one of a user's booking slots on a resource. */
export const ACTIVE_STATUSES = ["PENDING", "APPROVED", "CHECKED_IN"] as const;

export function toWindow(input: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}): BookingWindow {
  return {
    startDate: input.startDate,
    startMinute: timeToMinute(input.startTime),
    endDate: input.endDate,
    endMinute: timeToMinute(input.endTime),
  };
}

/** Stored instants -> the campus-local fields the booking form uses. */
export function bookingFormValues(b: { startsAt: Date; endsAt: Date; purpose: string }) {
  const s = instantToLocal(b.startsAt);
  const e = instantToLocal(b.endsAt);
  return {
    startDate: s.date,
    startTime: minuteToTime(s.minute),
    endDate: e.date,
    endTime: minuteToTime(e.minute),
    purpose: b.purpose,
  };
}

/** Loads everything the rules need and runs them for this user and window. */
export async function evaluateForUser(
  user: CurrentUser,
  resourceId: string,
  window: BookingWindow,
) {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: { slots: true, blackouts: true },
  });
  if (!resource || !canViewResource(user, resource)) {
    throw new ApiError(404, "Resource not found");
  }

  const { startsAt, endsAt } = windowInstants(window);
  const [grant, activeCount, conflict] = await Promise.all([
    db.eligibilityGrant.findUnique({
      where: { userId_resourceId: { userId: user.id, resourceId } },
      select: { id: true },
    }),
    // Drafts are not in ACTIVE_STATUSES, so the draft being checked never counts against itself.
    db.bookingRequest.count({
      where: { resourceId, requesterId: user.id, status: { in: [...ACTIVE_STATUSES] } },
    }),
    db.bookingRequest.findFirst({
      where: {
        resourceId,
        status: { in: ["APPROVED", "CHECKED_IN"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
  ]);

  const evaluation = evaluateBooking({
    user,
    resource,
    hasGrant: Boolean(grant),
    window,
    activeCount,
    hasConflict: Boolean(conflict),
  });
  return { resource, evaluation, startsAt, endsAt };
}

/** The requester's own booking, or 404. Mutations also require a specific status. */
export async function loadOwnBooking(user: CurrentUser, id: string) {
  const booking = await db.bookingRequest.findUnique({ where: { id } });
  if (!booking || booking.requesterId !== user.id) {
    throw new ApiError(404, "Booking not found");
  }
  return booking;
}

/** A booking the user is a party to (requester, owner, manager, admin), or 404. */
export async function loadPartyBooking(user: CurrentUser, id: string) {
  const booking = await db.bookingRequest.findUnique({
    where: { id },
    include: { resource: { select: { id: true, name: true, ownerId: true } } },
  });
  if (!booking || !canViewBooking(user, booking)) throw new ApiError(404, "Booking not found");
  return booking;
}

/** Requester, the resource's owner, managers and admins may view a booking. */
export function canViewBooking(
  user: CurrentUser,
  booking: { requesterId: string; resource: { ownerId: string } },
) {
  return (
    booking.requesterId === user.id ||
    booking.resource.ownerId === user.id ||
    user.role === "MANAGER" ||
    user.role === "ADMIN"
  );
}
