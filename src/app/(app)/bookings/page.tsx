import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { waitlistPosition } from "@/lib/approvals";
import { isOverdue } from "@/lib/checkin-rules";
import { formatWindow } from "@/lib/format";
import { BookingActions } from "@/components/booking-actions";
import { BookingStatusBadge } from "@/components/booking-status";
import { UsageSummary } from "@/components/usage-summary";

export const metadata = { title: "My bookings · Campus Lab Share" };

const ACTIVE = ["PENDING", "WAITLISTED", "APPROVED", "CHECKED_IN"];

export default async function BookingsPage() {
  const user = await requireUser();
  const bookings = await db.bookingRequest.findMany({
    where: { requesterId: user.id },
    include: { resource: { select: { id: true, name: true } } },
    orderBy: { startsAt: "desc" },
  });

  // Fair-usage standing: active bookings against the cap, plus any cooldowns still running.
  const now = new Date();
  const active = bookings.filter((b) => ["PENDING", "APPROVED", "CHECKED_IN"].includes(b.status)).length;
  const cooldowns = await db.bookingRequest
    .findMany({
      where: { requesterId: user.id, cooldownUntil: { gt: now } },
      select: { status: true, cooldownUntil: true, resource: { select: { name: true } } },
      orderBy: { cooldownUntil: "desc" },
    })
    .then((rows) => {
      const seen = new Map<string, { resource: string; until: Date; reason: "cancelled" | "no_show" }>();
      for (const r of rows) {
        if (!seen.has(r.resource.name)) {
          seen.set(r.resource.name, {
            resource: r.resource.name,
            until: r.cooldownUntil!,
            reason: r.status === "NO_SHOW" ? "no_show" : "cancelled",
          });
        }
      }
      return [...seen.values()];
    });

  // Where each waitlisted request stands in the first-come-first-served queue.
  const positions = new Map(
    await Promise.all(
      bookings
        .filter((b) => b.status === "WAITLISTED")
        .map(async (b) => [b.id, await waitlistPosition(b)] as const),
    ),
  );

  type Row = (typeof bookings)[number];
  const groups: [string, Row[]][] = [
    ["Drafts", bookings.filter((b) => b.status === "DRAFT")],
    ["Active requests", bookings.filter((b) => ACTIVE.includes(b.status))],
    ["Past", bookings.filter((b) => b.status !== "DRAFT" && !ACTIVE.includes(b.status))],
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My bookings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your drafts, requests and past bookings.
        </p>
      </div>

      <UsageSummary active={active} cooldowns={cooldowns} />

      {bookings.length === 0 ? (
        <div className="animate-pop-in rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-medium text-slate-700">You haven&apos;t requested anything yet.</p>
          <Link
            href="/resources"
            className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
          >
            Browse resources
          </Link>
        </div>
      ) : (
        groups
          .filter(([, rows]) => rows.length > 0)
          .map(([title, rows]) => (
            <section key={title} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {title} <span className="font-normal">({rows.length})</span>
              </h2>
              <ul className="space-y-3">
                {rows.map((b, i) => (
                  <li
                    key={b.id}
                    className="animate-fade-up flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/bookings/${b.id}`}
                          className="truncate font-semibold hover:text-indigo-700"
                        >
                          {b.resource.name}
                        </Link>
                        <BookingStatusBadge status={b.status} />
                        {isOverdue(b, new Date()) && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                            Overdue
                          </span>
                        )}
                        {positions.has(b.id) && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                            #{positions.get(b.id)} in line
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{formatWindow(b.startsAt, b.endsAt)}</p>
                      {b.decisionReason && b.status !== "DRAFT" ? (
                        <p className="line-clamp-2 text-sm text-slate-600">{b.decisionReason}</p>
                      ) : (
                        b.purpose && (
                          <p className="line-clamp-1 text-sm text-slate-500">{b.purpose}</p>
                        )
                      )}
                    </div>
                    <BookingActions id={b.id} resourceId={b.resource.id} status={b.status} />
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
