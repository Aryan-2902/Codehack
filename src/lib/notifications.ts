import "server-only";
import { db } from "@/lib/db";

/** What the notification is about; the feed uses it to pick an icon colour. */
export type NoticeKind =
  | "request"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "promoted"
  | "cancelled"
  | "checkin"
  | "checkout"
  | "overdue"
  | "reminder"
  | "incident"
  | "info";

type Notice = { userId: string; message: string; link?: string; kind?: NoticeKind };

/** Queue in-app notifications; the bell and /notifications feed read them back. */
export async function notify(notices: Notice[]) {
  if (notices.length === 0) return;
  await db.notification.createMany({
    data: notices.map((n) => ({
      userId: n.userId,
      message: n.message,
      link: n.link,
      kind: n.kind ?? "info",
    })),
  });
}

/** Everyone with a role that reviews or resolves things (used for incidents and overdue returns). */
export async function managerIds() {
  const managers = await db.user.findMany({
    where: { role: "MANAGER" },
    select: { id: true },
  });
  return managers.map((m) => m.id);
}
