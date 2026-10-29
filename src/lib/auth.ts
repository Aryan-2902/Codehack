import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";
import type { Role } from "@/generated/prisma/enums";

// The fields safe to hand to the UI (never passwordHash).
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  verified: true,
  safetyTrained: true,
  suspendedUntil: true,
  suspensionReason: true,
} as const;

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  verified: boolean;
  safetyTrained: boolean;
  suspendedUntil: Date | null;
  suspensionReason: string | null;
};

export { publicUserSelect };

// The JWT only proves identity; role/flags are always re-read from the DB so a
// role change or deleted account takes effect immediately.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.userId },
    select: publicUserSelect,
  });
});

/** For pages/layouts: redirect to /login when signed out, optionally restrict by role. */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public headers?: Record<string, string>,
  ) {
    super(message);
  }
}

/** For Route Handlers: throws ApiError(401/403) instead of redirecting. */
export async function requireApiUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Not signed in");
  if (roles && !roles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission to do that");
  }
  return user;
}
