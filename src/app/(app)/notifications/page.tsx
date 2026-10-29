import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { NotificationList } from "@/components/notification-list";

export const metadata = { title: "Notifications · Campus Lab Share" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          Approvals, waitlist updates, reminders, overdue returns and incidents.
        </p>
      </div>
      <NotificationList
        initial={notifications.map((n) => ({
          id: n.id,
          message: n.message,
          link: n.link,
          kind: n.kind,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
