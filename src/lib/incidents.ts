import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";

/**
 * Incidents a user may see: managers and admins see all of them (their review queue);
 * everyone else sees the ones they filed or that involve their own bookings or resources.
 */
export async function loadIncidents(user: CurrentUser) {
  const reviewer = user.role === "MANAGER" || user.role === "ADMIN";
  return db.incident.findMany({
    where: reviewer
      ? {}
      : {
          OR: [
            { reportedBy: user.id },
            { booking: { requesterId: user.id } },
            { booking: { resource: { ownerId: user.id } } },
          ],
        },
    include: {
      reporter: { select: { name: true } },
      resolvedBy: { select: { name: true } },
      booking: {
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          requester: { select: { id: true, name: true } },
          resource: { select: { id: true, name: true, ownerId: true } },
        },
      },
    },
    // OPEN sorts before RESOLVED (declaration order), then newest first.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export type IncidentRow = Awaited<ReturnType<typeof loadIncidents>>[number];
