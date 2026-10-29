import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/** Append one AuditLog entry (actor, action, target, timestamp). A null actor means the system. */
export async function audit(entry: {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await db.auditLog.create({ data: entry });
}
