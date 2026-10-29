import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { PROMOTED_REASON, pickPromotions } from "@/lib/approval-rules";

/** Bookings that currently hold a slot. */
export const HOLDING_STATUSES = ["APPROVED", "CHECKED_IN"] as const;

/** 1-based place in the FIFO waitlist among requests that overlap the same window. */
export async function waitlistPosition(b: {
  id: string;
  resourceId: string;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
}) {
  const ahead = await db.bookingRequest.count({
    where: {
      resourceId: b.resourceId,
      status: "WAITLISTED",
      id: { not: b.id },
      startsAt: { lt: b.endsAt },
      endsAt: { gt: b.startsAt },
      OR: [
        { createdAt: { lt: b.createdAt } },
        { createdAt: b.createdAt, id: { lt: b.id } },
      ],
    },
  });
  return ahead + 1;
}

/**
 * A booking that held a slot was cancelled. Walk the waitlist for that window in
 * first-come-first-served order and approve everyone who now fits, then tell them.
 * Safe to auto-approve: a reviewer already accepted these requests when they waitlisted them.
 */
export async function promoteWaitlist(
  resourceId: string,
  freed: { startsAt: Date; endsAt: Date },
  actorId: string,
) {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: { name: true },
  });

  const promoted = await db.$transaction(async (tx) => {
    const [waitlisted, occupied] = await Promise.all([
      tx.bookingRequest.findMany({
        where: {
          resourceId,
          status: "WAITLISTED",
          startsAt: { lt: freed.endsAt },
          endsAt: { gt: freed.startsAt },
        },
      }),
      tx.bookingRequest.findMany({
        where: { resourceId, status: { in: [...HOLDING_STATUSES] } },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    const ids = pickPromotions(waitlisted, occupied, new Date());
    const approved: typeof waitlisted = [];
    for (const id of ids) {
      const updated = await tx.bookingRequest.updateMany({
        where: { id, status: "WAITLISTED" },
        data: { status: "APPROVED", decisionReason: PROMOTED_REASON },
      });
      if (updated.count === 1) approved.push(waitlisted.find((w) => w.id === id)!);
    }
    return approved;
  });

  for (const b of promoted) {
    await audit({
      actorId,
      action: "booking.promoted",
      targetType: "BookingRequest",
      targetId: b.id,
      metadata: { rule: "waitlist is first come, first served" },
    });
  }
  await notify(
    promoted.map((b) => ({
      userId: b.requesterId,
      message: `A slot opened up: your request for ${resource?.name ?? "the resource"} was approved from the waitlist.`,
      link: `/bookings/${b.id}`,
      kind: "promoted" as const,
    })),
  );
  return promoted;
}
