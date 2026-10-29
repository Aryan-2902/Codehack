import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadPartyBooking } from "@/lib/bookings";
import { checkInState } from "@/lib/checkin-rules";
import { notify } from "@/lib/notifications";
import { sanitizePhotoIds } from "@/lib/photos";
import { conditionReportSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// The requester or the owner records the condition (photos + notes) and the start begins.
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const input = await parseBody(req, conditionReportSchema);
  const booking = await loadPartyBooking(user, id);

  const now = new Date();
  const state = checkInState(booking, now, process.env.DEMO_MODE === "true");
  if (!state.allowed) throw new ApiError(409, state.reason!);
  const photos = await sanitizePhotoIds(user, input.photoIds);

  const report = await db.$transaction(async (tx) => {
    const claimed = await tx.bookingRequest.updateMany({
      where: { id, status: "APPROVED" },
      data: { status: "CHECKED_IN", checkedInAt: now },
    });
    if (claimed.count === 0) throw new ApiError(409, "This booking has already been checked in");
    return tx.conditionReport.create({
      data: {
        bookingId: id,
        stage: "CHECK_IN",
        condition: input.condition,
        notes: input.notes,
        photos,
        reportedBy: user.id,
      },
    });
  });

  await audit({
    actorId: user.id,
    action: "booking.checked_in",
    targetType: "BookingRequest",
    targetId: id,
    metadata: { condition: input.condition, photos: photos.length },
  });

  // Tell the other party; whoever did the check-in already knows.
  const others = [booking.requesterId, booking.resource.ownerId].filter((u) => u !== user.id);
  await notify(
    [...new Set(others)].map((userId) => ({
      userId,
      message: `${booking.resource.name} was checked in by ${user.name}.`,
      link: `/bookings/${id}`,
      kind: "checkin" as const,
    })),
  );

  return NextResponse.json({ report, checkedInAt: now }, { status: 201 });
});
