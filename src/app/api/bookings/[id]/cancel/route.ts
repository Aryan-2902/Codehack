import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadOwnBooking } from "@/lib/bookings";

type Ctx = { params: Promise<{ id: string }> };

// A requester can withdraw a request that hasn't been decided yet.
// (Cancelling an approved booking and promoting the waitlist arrives with the approval workflow.)
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const booking = await loadOwnBooking(user, id);

  const updated = await db.bookingRequest.updateMany({
    where: { id, status: { in: ["PENDING", "WAITLISTED"] } },
    data: { status: "CANCELLED" },
  });
  if (updated.count === 0) {
    throw new ApiError(409, "This request can't be cancelled in its current state");
  }

  await audit({
    actorId: user.id,
    action: "booking.cancelled",
    targetType: "BookingRequest",
    targetId: id,
    metadata: { from: booking.status },
  });
  return NextResponse.json({ ok: true });
});
