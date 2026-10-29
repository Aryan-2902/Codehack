import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { promoteWaitlist } from "@/lib/approvals";
import { loadOwnBooking } from "@/lib/bookings";
import { cooldownEndsAt } from "@/lib/fair-usage";
import { notify } from "@/lib/notifications";

type Ctx = { params: Promise<{ id: string }> };

// A requester withdraws their own request or booking. Cancelling an approved booking frees the
// slot, so the first person on the waitlist for it is promoted and notified.
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const booking = await loadOwnBooking(user, id);

  // Fair usage: walking away from an approved slot pauses re-requesting that resource.
  // Withdrawing a request that was never approved costs nothing.
  const cooldownUntil = booking.status === "APPROVED" ? cooldownEndsAt(new Date()) : null;

  const updated = await db.bookingRequest.updateMany({
    where: { id, status: { in: ["PENDING", "WAITLISTED", "APPROVED"] } },
    data: { status: "CANCELLED", ...(cooldownUntil ? { cooldownUntil } : {}) },
  });
  if (updated.count === 0) {
    throw new ApiError(409, "This request can't be cancelled in its current state");
  }

  await audit({
    actorId: user.id,
    action: "booking.cancelled",
    targetType: "BookingRequest",
    targetId: id,
    metadata: {
      from: booking.status,
      by: "requester",
      ...(cooldownUntil
        ? { cooldownUntil: cooldownUntil.toISOString(), rule: "fair usage: cooldown after cancelling an approved booking" }
        : {}),
    },
  });

  if (booking.status === "APPROVED") {
    const resource = await db.resource.findUniqueOrThrow({
      where: { id: booking.resourceId },
      select: { name: true, ownerId: true },
    });
    await notify([
      {
        userId: resource.ownerId,
        message: `${user.name} cancelled their approved booking for ${resource.name}.`,
        link: "/review",
        kind: "cancelled",
      },
    ]);
    await promoteWaitlist(booking.resourceId, booking, user.id);
  }
  return NextResponse.json({ ok: true, cooldownUntil });
});
