import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { checkEligibility } from "@/lib/eligibility";
import { windowToInstants, timeToMinute } from "@/lib/format";
import {
  isAvailable,
  matchingCategories,
  searchTerms,
  type ResourceSearch,
} from "@/lib/availability";

const MAX_RESULTS = 100;

/**
 * Keyword + filter search over the resources a user may see.
 * Text/category/location run in SQL; availability and eligibility need per-row rules,
 * so they run on the (small) candidate set afterwards.
 */
export async function searchResources(user: CurrentUser, search: ResourceSearch) {
  const and: Prisma.ResourceWhereInput[] = [
    // Retired listings are hidden except from their owner and admins.
    user.role === "ADMIN"
      ? {}
      : { OR: [{ status: { not: "RETIRED" } }, { ownerId: user.id }] },
  ];

  // Every word must match somewhere, so "laser cutter" narrows rather than widens.
  for (const term of searchTerms(search.q)) {
    const categories = matchingCategories(term);
    and.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { location: { contains: term, mode: "insensitive" } },
        ...(categories.length ? [{ category: { in: categories } }] : []),
      ],
    });
  }
  if (search.category) and.push({ category: search.category });
  if (search.location) and.push({ location: { contains: search.location, mode: "insensitive" } });

  const [candidates, grants] = await Promise.all([
    db.resource.findMany({
      where: { AND: and },
      include: {
        owner: { select: { id: true, name: true } },
        slots: true,
        blackouts: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS,
    }),
    db.eligibilityGrant.findMany({
      where: { userId: user.id },
      select: { resourceId: true },
    }),
  ]);
  const grantedIds = new Set(grants.map((g) => g.resourceId));

  let results = candidates;

  if (search.date) {
    const { date, from, to } = search;
    const window = from && to ? { from, to } : undefined;
    results = results.filter((r) => isAvailable(r, date, window));

    // With a time window, also drop resources already booked over it.
    if (window && results.length) {
      const { startsAt, endsAt } = windowToInstants(
        date,
        timeToMinute(window.from),
        timeToMinute(window.to),
      );
      const taken = await db.bookingRequest.findMany({
        where: {
          resourceId: { in: results.map((r) => r.id) },
          status: { in: ["APPROVED", "CHECKED_IN"] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { resourceId: true },
      });
      const takenIds = new Set(taken.map((b) => b.resourceId));
      results = results.filter((r) => !takenIds.has(r.id));
    }
  }

  // Your own listings have no eligibility to check; everything else gets an explanation.
  const withEligibility = results.map((r) => ({
    ...r,
    eligibility:
      r.ownerId === user.id ? null : checkEligibility(user, r, grantedIds.has(r.id)),
  }));

  return search.eligible
    ? withEligibility.filter((r) => r.eligibility?.eligible)
    : withEligibility;
}

export type ResourceResult = Awaited<ReturnType<typeof searchResources>>[number];
