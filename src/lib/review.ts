import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { canDecide, needsManager, overlaps } from "@/lib/approval-rules";
import { checkEligibility } from "@/lib/eligibility";
import { HOLDING_STATUSES, waitlistPosition } from "@/lib/approvals";

const QUEUE_STATUSES = ["PENDING", "WAITLISTED", "APPROVED", "CHECKED_IN"] as const;

/**
 * Requests a reviewer can act on, each with the competing requests for the same slot,
 * the requester's eligibility, and (for the waitlist) their place in line.
 * Owners see their own resources; managers and admins see everything.
 */
export async function loadReviewQueue(user: CurrentUser) {
  const now = new Date();
  const bookings = await db.bookingRequest.findMany({
    where: {
      status: { in: [...QUEUE_STATUSES] },
      endsAt: { gt: now },
      resource: user.role === "OWNER" ? { ownerId: user.id } : {},
    },
    include: {
      resource: true,
      requester: {
        select: { id: true, name: true, department: true, role: true, verified: true, safetyTrained: true },
      },
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
  });

  const grants = bookings.length
    ? await db.eligibilityGrant.findMany({
        where: {
          userId: { in: bookings.map((b) => b.requesterId) },
          resourceId: { in: bookings.map((b) => b.resourceId) },
        },
        select: { userId: true, resourceId: true },
      })
    : [];
  const granted = new Set(grants.map((g) => `${g.userId}:${g.resourceId}`));

  const items = await Promise.all(
    bookings.map(async (b) => {
      const others = bookings.filter((o) => o.id !== b.id && o.resourceId === b.resourceId && overlaps(o, b));
      return {
        id: b.id,
        status: b.status,
        purpose: b.purpose,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        createdAt: b.createdAt.toISOString(),
        decisionReason: b.decisionReason,
        resource: { id: b.resource.id, name: b.resource.name },
        requester: {
          name: b.requester.name,
          department: b.requester.department,
          verified: b.requester.verified,
          safetyTrained: b.requester.safetyTrained,
        },
        eligibility: checkEligibility(b.requester, b.resource, granted.has(`${b.requesterId}:${b.resourceId}`)),
        canDecide: canDecide(user, b.resource),
        needsManager: needsManager(b.resource),
        position: b.status === "WAITLISTED" ? await waitlistPosition(b) : null,
        started: b.startsAt <= now,
        conflicts: others.map((o) => ({
          id: o.id,
          status: o.status,
          requesterName: o.requester.name,
          startsAt: o.startsAt.toISOString(),
          endsAt: o.endsAt.toISOString(),
          holdsSlot: (HOLDING_STATUSES as readonly string[]).includes(o.status),
        })),
      };
    }),
  );

  return items;
}

export type ReviewItem = Awaited<ReturnType<typeof loadReviewQueue>>[number];
