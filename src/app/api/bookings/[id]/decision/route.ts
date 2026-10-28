import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canDecide, canSeeInQueue, waitlistReason } from "@/lib/approval-rules";
import { HOLDING_STATUSES, promoteWaitlist, waitlistPosition } from "@/lib/approvals";
import { notify } from "@/lib/notifications";
import { decisionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// One endpoint for every reviewer decision: approve, reject, waitlist, or cancel an approved booking.
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const actor = await requireApiUser(["OWNER", "MANAGER", "ADMIN"]);
  const { id } = await params;
  const { action, reason } = await parseBody(req, decisionSchema);

  const booking = await db.bookingRequest.findUnique({
    where: { id },
    include: { resource: true },
  });
  if (!booking || !canSeeInQueue(actor, booking.resource)) {
    throw new ApiError(404, "Booking not found");
  }
  if (!canDecide(actor, booking.resource)) {
    throw new ApiError(
      403,
      "This resource needs manager approval, so only a manager can decide on requests for it",
    );
  }

  const name = booking.resource.name;
  const link = `/bookings/${id}`;
  const taken = {
    resourceId: booking.resourceId,
    id: { not: id },
    status: { in: [...HOLDING_STATUSES] },
    startsAt: { lt: booking.endsAt },
    endsAt: { gt: booking.startsAt },
  };

  if (action === "approve") {
    const decisionReason = reason || `Approved by ${actor.name}`;
    // Re-read and check inside one transaction so two reviewers can't double-book a slot.
    await db.$transaction(async (tx) => {
      const fresh = await tx.bookingRequest.findUnique({ where: { id } });
      if (!fresh || !["PENDING", "WAITLISTED"].includes(fresh.status)) {
        throw new ApiError(409, "This request has already been decided");
      }
      if (booking.resource.status !== "ACTIVE") {
        throw new ApiError(409, "This resource is not open for booking");
      }
      if (fresh.startsAt <= new Date()) {
        throw new ApiError(409, "This request's start time has already passed");
      }
      if (await tx.bookingRequest.findFirst({ where: taken, select: { id: true } })) {
        throw new ApiError(
          409,
          "This slot is already booked by an approved request. Waitlist this request instead.",
        );
      }
      await tx.bookingRequest.update({
        where: { id },
        data: { status: "APPROVED", managerId: actor.id, decisionReason },
      });
    });
    await audit({ actorId: actor.id, action: "booking.approved", targetType: "BookingRequest", targetId: id, metadata: { reason: decisionReason } });
    await notify([{ userId: booking.requesterId, message: `Your request for ${name} was approved.`, link }]);
  } else if (action === "reject") {
    const updated = await db.bookingRequest.updateMany({
      where: { id, status: { in: ["PENDING", "WAITLISTED"] } },
      data: { status: "REJECTED", managerId: actor.id, decisionReason: reason },
    });
    if (updated.count === 0) throw new ApiError(409, "This request has already been decided");
    await audit({ actorId: actor.id, action: "booking.rejected", targetType: "BookingRequest", targetId: id, metadata: { reason } });
    await notify([{ userId: booking.requesterId, message: `Your request for ${name} was rejected: ${reason}`, link }]);
  } else if (action === "waitlist") {
    if (booking.status !== "PENDING") {
      throw new ApiError(409, "Only pending requests can be waitlisted");
    }
    if (!(await db.bookingRequest.findFirst({ where: taken, select: { id: true } }))) {
      throw new ApiError(
        409,
        "This slot is free, so approve or reject the request instead of waitlisting it.",
      );
    }
    const position = await waitlistPosition(booking);
    const decisionReason = waitlistReason(position, reason);
    const updated = await db.bookingRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "WAITLISTED", managerId: actor.id, decisionReason },
    });
    if (updated.count === 0) throw new ApiError(409, "This request has already been decided");
    await audit({ actorId: actor.id, action: "booking.waitlisted", targetType: "BookingRequest", targetId: id, metadata: { position, rule: "slot already booked; first come, first served" } });
    await notify([{ userId: booking.requesterId, message: `Your request for ${name} was waitlisted (#${position}). You'll be notified if a slot opens up.`, link }]);
  } else {
    // cancel: a reviewer withdraws an approved booking, which frees the slot for the waitlist
    const updated = await db.bookingRequest.updateMany({
      where: { id, status: "APPROVED" },
      data: { status: "CANCELLED", managerId: actor.id, decisionReason: reason },
    });
    if (updated.count === 0) throw new ApiError(409, "Only approved bookings can be cancelled");
    await audit({ actorId: actor.id, action: "booking.cancelled", targetType: "BookingRequest", targetId: id, metadata: { by: "reviewer", reason } });
    await notify([{ userId: booking.requesterId, message: `Your approved booking for ${name} was cancelled: ${reason}`, link }]);
    await promoteWaitlist(booking.resourceId, booking, actor.id);
  }

  const result = await db.bookingRequest.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ booking: result });
});
