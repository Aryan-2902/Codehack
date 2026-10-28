import "server-only";
import { db } from "@/lib/db";

type Notice = { userId: string; message: string; link?: string };

/** Queue in-app notifications; the feed that displays them comes with the notifications feature. */
export async function notify(notices: Notice[]) {
  if (notices.length === 0) return;
  await db.notification.createMany({
    data: notices.map((n) => ({ userId: n.userId, message: n.message, link: n.link })),
  });
}
