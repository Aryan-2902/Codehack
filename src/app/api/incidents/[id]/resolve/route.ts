import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { resolveIncidentSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// A manager or admin reviews the incident and records the outcome. Any penalty (a booking
// suspension) is a deliberate human choice, recorded against the borrower and visible to both parties.
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const actor = await requireApiUser(["MANAGER", "ADMIN"]);
  const { id } = await params;
  const { resolution, suspensionDays } = await parseBody(req, resolveIncidentSchema);

  const incident = await db.incident.findUnique({
    where: { id },
    include: {
      booking: {
        select: {
          id: true,
          requesterId: true,
          resource: { select: { name: true, ownerId: true } },
        },
      },
    },
  });
  if (!incident) throw new ApiError(404, "Incident not found");

  const { booking } = incident;
  const now = new Date();
  const until = suspensionDays > 0 ? new Date(now.getTime() + suspensionDays * 86_400_000) : null;

  await db.$transaction(async (tx) => {
    const claimed = await tx.incident.updateMany({
      where: { id, status: "OPEN" },
      data: {
        status: "RESOLVED",
        resolution,
        resolvedById: actor.id,
        resolvedAt: now,
        suspensionDays: suspensionDays || null,
      },
    });
    if (claimed.count === 0) throw new ApiError(409, "This incident has already been resolved");

    if (until) {
      // Never shorten a suspension that is already longer.
      const current = await tx.user.findUniqueOrThrow({
        where: { id: booking.requesterId },
        select: { suspendedUntil: true },
      });
      if (!current.suspendedUntil || current.suspendedUntil < until) {
        await tx.user.update({
          where: { id: booking.requesterId },
          data: {
            suspendedUntil: until,
            suspensionReason: `${incident.type.toLowerCase()} incident on ${booking.resource.name}`,
          },
        });
      }
    }
  });

  await audit({
    actorId: actor.id,
    action: "incident.resolved",
    targetType: "BookingRequest",
    targetId: booking.id,
    metadata: { incidentId: id, suspensionDays },
  });
  if (until) {
    await audit({
      actorId: actor.id,
      action: "user.suspended",
      targetType: "User",
      targetId: booking.requesterId,
      metadata: { incidentId: id, until: until.toISOString(), days: suspensionDays },
    });
  }

  // Both parties, and whoever filed it, see the outcome.
  const recipients = new Set([incident.reportedBy, booking.requesterId, booking.resource.ownerId]);
  recipients.delete(actor.id);
  await notify(
    [...recipients].map((userId) => ({
      userId,
      message: `Incident resolved for ${booking.resource.name}: ${resolution}${
        suspensionDays > 0 && userId === booking.requesterId
          ? ` Your booking privileges are suspended for ${suspensionDays} day${suspensionDays === 1 ? "" : "s"}.`
          : ""
      }`,
      link: `/bookings/${booking.id}`,
      kind: "incident" as const,
    })),
  );

  const resolved = await db.incident.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ incident: resolved });
});
