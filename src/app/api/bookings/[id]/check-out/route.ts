import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadPartyBooking } from "@/lib/bookings";
import {
  checkOutState,
  conditionChange,
  formatLate,
  lateMinutes,
} from "@/lib/checkin-rules";
import { notify } from "@/lib/notifications";
import { sanitizePhotoIds } from "@/lib/photos";
import { conditionReportSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// Return: record the condition again, note any difference from check-in, and complete the booking.
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const input = await parseBody(req, conditionReportSchema);
  const booking = await loadPartyBooking(user, id);

  const state = checkOutState(booking);
  if (!state.allowed) throw new ApiError(409, state.reason!);
  const photos = await sanitizePhotoIds(user, input.photoIds);

  const before = await db.conditionReport.findFirst({
    where: { bookingId: id, stage: "CHECK_IN" },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const report = await db.$transaction(async (tx) => {
    const claimed = await tx.bookingRequest.updateMany({
      where: { id, status: "CHECKED_IN" },
      data: { status: "COMPLETED", checkedOutAt: now },
    });
    if (claimed.count === 0) throw new ApiError(409, "This booking has already been checked out");
    return tx.conditionReport.create({
      data: {
        bookingId: id,
        stage: "CHECK_OUT",
        condition: input.condition,
        notes: input.notes,
        photos,
        reportedBy: user.id,
      },
    });
  });

  const late = lateMinutes(booking.endsAt, now);
  const change = before ? conditionChange(before.condition, input.condition) : "same";

  await audit({
    actorId: user.id,
    action: "booking.checked_out",
    targetType: "BookingRequest",
    targetId: id,
    metadata: { condition: input.condition, conditionChange: change, lateMinutes: late },
  });

  const flags = [
    late > 0 ? `returned ${formatLate(late)} late` : null,
    change === "worse" ? "condition is worse than at pick-up" : null,
  ].filter(Boolean);
  const others = [booking.requesterId, booking.resource.ownerId].filter((u) => u !== user.id);
  await notify(
    [...new Set(others)].map((userId) => ({
      userId,
      message: `${booking.resource.name} was checked out by ${user.name}${flags.length ? ` (${flags.join("; ")})` : ""}.`,
      link: `/bookings/${id}`,
      kind: "checkout" as const,
    })),
  );

  return NextResponse.json(
    {
      report,
      checkedOutAt: now,
      lateMinutes: late,
      conditionChange: change,
      // Worth raising with a manager: it never happens automatically.
      suggestIncident: late > 0 || change === "worse" || input.condition === "DAMAGED",
    },
    { status: 201 },
  );
});
