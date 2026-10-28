import "server-only";
import { db } from "@/lib/db";
import { ApiError, type CurrentUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import type { ResourceInput } from "@/lib/validation";

export const resourceInclude = {
  owner: { select: { id: true, name: true, department: true } },
  slots: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] },
  blackouts: { orderBy: { date: "asc" } },
} satisfies Prisma.ResourceInclude;

export function canEditResource(user: CurrentUser, resource: { ownerId: string }) {
  return user.role === "ADMIN" || (user.role === "OWNER" && resource.ownerId === user.id);
}

/** Retired listings are only visible to their owner and admins. */
export function canViewResource(
  user: CurrentUser,
  resource: { ownerId: string; status: string },
) {
  return resource.status !== "RETIRED" || canEditResource(user, resource);
}

/** Loads a resource for editing or throws 404/403. */
export async function loadEditableResource(user: CurrentUser, id: string) {
  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource) throw new ApiError(404, "Resource not found");
  if (!canEditResource(user, resource)) {
    throw new ApiError(403, "Only the owner or an admin can edit this listing");
  }
  return resource;
}

/** Splits validated input into the Resource columns and its child rows. */
export function splitInput(input: ResourceInput) {
  const { slots, blackouts, ...fields } = input;
  return {
    fields: { ...fields, depositAmount: input.depositRequired ? input.depositAmount : null },
    slots,
    // Keyed by date so duplicate dates can't violate the (resource, date) unique index.
    blackouts: [...new Map(blackouts.map((b) => [b.date, b])).values()].map((b) => ({
      date: new Date(`${b.date}T00:00:00.000Z`),
      reason: b.reason || null,
    })),
  };
}
