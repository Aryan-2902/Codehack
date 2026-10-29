import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { runScheduledChecks } from "@/lib/sweeps";

// Polled by the bell in the nav. Also raises any overdue/reminder notifications that have come due.
export const GET = handle(async () => {
  const user = await requireApiUser();
  await runScheduledChecks();

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);
  return NextResponse.json({ notifications, unread });
});
