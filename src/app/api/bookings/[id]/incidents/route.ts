import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadPartyBooking } from "@/lib/bookings";
import { managerIds, notify } from "@/lib/notifications";
import { sanitizePhotoIds } from "@/lib/photos";
import { incidentSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// Either party can file an incident (damage, delay or conflict) once a booking has been approved.
// It goes to the manager/admin queue; filing never penalises anyone.
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const booking = await loadPartyBooking(user, id);
  const input = await parseBody(req, incidentSchema);

  if (!["APPROVED", "CHECKED_IN", "COMPLETED"].includes(booking.status)) {
    throw new ApiError(409, "Incidents can only be filed for approved bookings");
  }
  const photos = await sanitizePhotoIds(user, input.photoIds);

  const incident = await db.incident.create({
    data: {
      bookingId: id,
      type: input.type,
      description: input.description,
      photos,
      reportedBy: user.id,
    },
  });
  await audit({
    actorId: user.id,
    action: "incident.filed",
    targetType: "BookingRequest",
    targetId: id,
    metadata: { incidentId: incident.id, type: input.type },
  });

  // The managers' queue, plus the other party (the filer already knows).
  const recipients = new Set([
    ...(await managerIds()),
    booking.requesterId,
    booking.resource.ownerId,
  ]);
  recipients.delete(user.id);
  await notify(
    [...recipients].map((userId) => ({
      userId,
      message: `${user.name} reported a ${input.type.toLowerCase()} incident for ${booking.resource.name}.`,
      link: "/incidents",
      kind: "incident" as const,
    })),
  );

  return NextResponse.json({ incident }, { status: 201 });
});
