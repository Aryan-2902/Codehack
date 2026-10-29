import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AUDIT_GROUPS } from "@/lib/audit-describe";

const actor = { select: { name: true, role: true } } as const;

/** The full replayable history of one booking, oldest first. */
export function loadBookingTimeline(bookingId: string) {
  return db.auditLog.findMany({
    where: { targetType: "BookingRequest", targetId: bookingId },
    include: { actor },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

/** What happened to a listing: created, edited, who was approved for it. Newest first. */
export function loadResourceHistory(resourceId: string, take = 25) {
  return db.auditLog.findMany({
    where: { targetType: "Resource", targetId: resourceId },
    include: { actor },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export const AUDIT_PAGE_SIZE = 25;

export type AuditQuery = { group?: string; q?: string; page?: number };

function whereFor({ group, q }: AuditQuery): Prisma.AuditLogWhereInput {
  const prefixes = AUDIT_GROUPS.find(([key]) => key === group)?.[2];
  const and: Prisma.AuditLogWhereInput[] = [];
  if (prefixes) and.push({ OR: prefixes.map((p) => ({ action: { startsWith: p } })) });
  if (q?.trim()) {
    and.push({
      OR: [
        { action: { contains: q.trim(), mode: "insensitive" } },
        { actor: { name: { contains: q.trim(), mode: "insensitive" } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

/** Platform-wide history for admins, newest first, filterable and paged. */
export async function searchAudit(query: AuditQuery) {
  const where = whereFor(query);
  const page = Math.max(1, query.page ?? 1);
  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);
  return { entries, total, page, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)) };
}

/** Everything matching the filters, for the CSV export (capped). */
export function exportAudit(query: AuditQuery, max = 5000) {
  return db.auditLog.findMany({
    where: whereFor(query),
    include: { actor },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: max,
  });
}

export type AuditEntry = Awaited<ReturnType<typeof loadBookingTimeline>>[number];

/** Where a log entry's subject lives in the app, if anywhere. */
export function targetHref(targetType: string, targetId: string) {
  if (targetType === "BookingRequest") return `/bookings/${targetId}`;
  if (targetType === "Resource") return `/resources/${targetId}`;
  return null;
}

/** Guards CSV cells against spreadsheet formula injection and quotes them. */
export function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
