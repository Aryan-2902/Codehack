import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { evaluateForUser, toWindow } from "@/lib/bookings";
import { bookingCreateSchema } from "@/lib/validation";

// The requester's own bookings, newest first.
export const GET = handle(async () => {
  const user = await requireApiUser();
  const bookings = await db.bookingRequest.findMany({
    where: { requesterId: user.id },
    include: { resource: { select: { id: true, name: true, category: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ bookings });
});

// Step 1 of the flow: save a DRAFT and return the eligibility check for it.
// Nothing is sent to a reviewer until the draft is submitted.
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  const input = await parseBody(req, bookingCreateSchema);

  const { resource, evaluation, startsAt, endsAt } = await evaluateForUser(
    user,
    input.resourceId,
    toWindow(input),
  );
  if (resource.ownerId === user.id) {
    throw new ApiError(400, "You can't book a resource you own");
  }

  const booking = await db.bookingRequest.create({
    data: {
      resourceId: resource.id,
      requesterId: user.id,
      purpose: input.purpose,
      startsAt,
      endsAt,
      status: "DRAFT",
    },
  });
  return NextResponse.json({ booking, evaluation }, { status: 201 });
});
