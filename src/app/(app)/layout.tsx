import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { runScheduledChecks } from "@/lib/sweeps";
import { formatDate } from "@/lib/format";
import { RoleBadge } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isReviewer = user.role !== "STUDENT";
  const isManager = user.role === "MANAGER" || user.role === "ADMIN";

  // Overdue returns and start reminders are raised lazily whenever someone loads a page.
  await runScheduledChecks();

  const [waiting, openIncidents, unread] = await Promise.all([
    // Requests still waiting for a first decision.
    isReviewer
      ? db.bookingRequest.count({
          where: {
            status: "PENDING",
            endsAt: { gt: new Date() },
            resource: user.role === "OWNER" ? { ownerId: user.id } : {},
          },
        })
      : 0,
    isManager ? db.incident.count({ where: { status: "OPEN" } }) : 0,
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  const suspended = user.suspendedUntil && user.suspendedUntil > new Date();
  const link = "text-slate-600 transition hover:text-slate-900";
  const badge =
    "animate-pop-in rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-semibold leading-none text-white";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 animate-fade-in border-b border-slate-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
          <Link href="/dashboard" className="text-base font-bold text-indigo-700">
            Campus Lab Share
          </Link>
          <Link href="/dashboard" className={link}>
            Dashboard
          </Link>
          <Link href="/resources" className={link}>
            Resources
          </Link>
          <Link href="/bookings" className={link}>
            My bookings
          </Link>
          {isReviewer && (
            <Link href="/review" className={`${link} flex items-center gap-1.5`}>
              Review
              {waiting > 0 && <span className={badge}>{waiting}</span>}
            </Link>
          )}
          {isReviewer && (
            <Link href="/incidents" className={`${link} flex items-center gap-1.5`}>
              Incidents
              {openIncidents > 0 && <span className={badge}>{openIncidents}</span>}
            </Link>
          )}
          {isReviewer && (
            <Link href="/people" className={link}>
              People
            </Link>
          )}
          {user.role === "ADMIN" && (
            <Link href="/audit" className={link}>
              Audit
            </Link>
          )}
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell initialUnread={unread} />
            <Link href="/profile" className="flex items-center gap-2 hover:underline">
              <span className="font-medium">{user.name}</span>
              <RoleBadge role={user.role} />
            </Link>
            <LogoutButton />
          </div>
        </nav>
      </header>
      {suspended && user.suspendedUntil && (
        <div className="animate-fade-in border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900">
          Your booking privileges are suspended until{" "}
          <strong>{formatDate(user.suspendedUntil)}</strong>
          {user.suspensionReason ? ` (${user.suspensionReason})` : ""}. You can still use bookings you already have.
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
