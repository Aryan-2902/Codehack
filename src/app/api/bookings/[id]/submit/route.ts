import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { bookingFormValues, evaluateForUser, loadOwnBooking, toWindow } from "@/lib/bookings";
import { MIN_PURPOSE_LENGTH } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// Step 3: re-run every rule on the server, then move DRAFT -> PENDING.
// Eligibility is never trusted from the client: a failing check blocks the submit with 422.
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const draft = await loadOwnBooking(user, id);
  if (draft.status !== "DRAFT") throw new ApiError(409, "This request has already been submitted");

  if (draft.purpose.trim().length < MIN_PURPOSE_LENGTH) {
    throw new ApiError(400, `Describe your purpose in at least ${MIN_PURPOSE_LENGTH} characters`);
  }

  const { evaluation } = await evaluateForUser(
    user,
    draft.resourceId,
    toWindow(bookingFormValues(draft)),
  );

  await audit({
    actorId: user.id,
    action: "booking.eligibility_checked",
    targetType: "BookingRequest",
    targetId: id,
    metadata: {
      passed: evaluation.ok,
      failed: evaluation.checks.filter((c) => !c.ok).map((c) => c.key),
    },
  });

  if (!evaluation.ok) {
    const firstFailure = evaluation.checks.find((c) => !c.ok);
    return NextResponse.json(
      { error: firstFailure?.message ?? "Request does not meet the requirements", evaluation },
      { status: 422 },
    );
  }

  const updated = await db.bookingRequest.updateMany({
    where: { id, status: "DRAFT" },
    data: { status: "PENDING" },
  });
  if (updated.count === 0) throw new ApiError(409, "This request has already been submitted");

  await audit({
    actorId: user.id,
    action: "booking.submitted",
    targetType: "BookingRequest",
    targetId: id,
    metadata: { resourceId: draft.resourceId },
  });

  const booking = await db.bookingRequest.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ booking, evaluation });
});
