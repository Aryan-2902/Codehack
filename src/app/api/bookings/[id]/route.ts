import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { canViewBooking, evaluateForUser, loadOwnBooking, toWindow } from "@/lib/bookings";
import { bookingUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const booking = await db.bookingRequest.findUnique({
    where: { id },
    include: {
      resource: { select: { id: true, name: true, category: true, ownerId: true } },
      requester: { select: { id: true, name: true, department: true } },
    },
  });
  if (!booking || !canViewBooking(user, booking)) throw new ApiError(404, "Booking not found");
  return NextResponse.json({ booking });
});

// Edit a draft (e.g. going back from the review step) and re-run the check.
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const existing = await loadOwnBooking(user, id);
  if (existing.status !== "DRAFT") {
    throw new ApiError(409, "Only drafts can be edited");
  }
  const input = await parseBody(req, bookingUpdateSchema);

  const { evaluation, startsAt, endsAt } = await evaluateForUser(
    user,
    existing.resourceId,
    toWindow(input),
  );
  const updated = await db.bookingRequest.updateMany({
    where: { id, status: "DRAFT" },
    data: { purpose: input.purpose, startsAt, endsAt },
  });
  if (updated.count === 0) throw new ApiError(409, "Only drafts can be edited");

  const booking = await db.bookingRequest.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ booking, evaluation });
});

// Discard a draft.
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  await loadOwnBooking(user, id);
  const deleted = await db.bookingRequest.deleteMany({ where: { id, status: "DRAFT" } });
  if (deleted.count === 0) throw new ApiError(409, "Only drafts can be discarded");
  return NextResponse.json({ ok: true });
});
