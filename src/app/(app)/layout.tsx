import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { RoleBadge } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isReviewer = user.role !== "STUDENT";

  // Badge on the Review link: requests still waiting for a first decision.
  const waiting = isReviewer
    ? await db.bookingRequest.count({
        where: {
          status: "PENDING",
          endsAt: { gt: new Date() },
          resource: user.role === "OWNER" ? { ownerId: user.id } : {},
        },
      })
    : 0;

  const link = "text-slate-600 transition hover:text-slate-900";

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
              {waiting > 0 && (
                <span className="animate-pop-in rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                  {waiting}
                </span>
              )}
            </Link>
          )}
          {isReviewer && (
            <Link href="/people" className={link}>
              People
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 hover:underline">
              <span className="font-medium">{user.name}</span>
              <RoleBadge role={user.role} />
            </Link>
            <LogoutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
