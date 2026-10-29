import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { waitlistPosition } from "@/lib/approvals";
import { canViewBooking } from "@/lib/bookings";
import { checkInState, formatLate, isOverdue, lateMinutes } from "@/lib/checkin-rules";
import { CATEGORY_LABELS, formatWindow, timeAgo } from "@/lib/format";
import { BookingActions } from "@/components/booking-actions";
import { BookingProgress } from "@/components/booking-progress";
import { BookingStatusBadge } from "@/components/booking-status";
import { ConditionPanel } from "@/components/condition-panel";
import { ConditionReports } from "@/components/condition-reports";
import { IncidentCard } from "@/components/incident-card";
import { IncidentPanel } from "@/components/incident-panel";
import { Card } from "@/components/ui";

export const metadata = { title: "Booking · Campus Lab Share" };

export default async function BookingDetailPage({ params }: PageProps<"/bookings/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const b = await db.bookingRequest.findUnique({
    where: { id },
    include: {
      resource: { select: { id: true, name: true, category: true, location: true, ownerId: true } },
      requester: { select: { name: true, department: true } },
      manager: { select: { name: true } },
      conditionReports: {
        orderBy: { createdAt: "asc" },
        include: { reporter: { select: { name: true } } },
      },
      incidents: {
        orderBy: { createdAt: "desc" },
        include: { reporter: { select: { name: true } }, resolvedBy: { select: { name: true } } },
      },
    },
  });
  if (!b || !canViewBooking(user, b)) notFound();

  const now = new Date();
  const mine = b.requesterId === user.id;
  const position = b.status === "WAITLISTED" ? await waitlistPosition(b) : null;
  const overdue = isOverdue(b, now);
  const checkIn = checkInState(b, now, process.env.DEMO_MODE === "true");
  const late = b.checkedOutAt ? lateMinutes(b.endsAt, b.checkedOutAt) : 0;
  const canReport = ["APPROVED", "CHECKED_IN", "COMPLETED"].includes(b.status);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/bookings" className="text-sm text-indigo-600 hover:underline">
        ← My bookings
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{b.resource.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {CATEGORY_LABELS[b.resource.category]} · {b.resource.location}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {position && (
            <span className="animate-pop-in rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
              #{position} in line
            </span>
          )}
          {overdue && (
            <span className="animate-pop-in rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
              Overdue
            </span>
          )}
          <BookingStatusBadge status={b.status} />
        </div>
      </div>

      <Card>
        <BookingProgress status={b.status} overdue={overdue} />
      </Card>

      {overdue && (
        <div className="animate-pop-in rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">This booking is overdue.</p>
          <p className="mt-1">
            It was due back {timeAgo(b.endsAt)}. Please return it and check out as soon as you can.
          </p>
        </div>
      )}

      {b.status === "APPROVED" &&
        (checkIn.allowed ? (
          <ConditionPanel bookingId={b.id} mode="check-in" />
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {checkIn.reason}
          </p>
        ))}
      {b.status === "CHECKED_IN" && <ConditionPanel bookingId={b.id} mode="check-out" />}

      <Card>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-slate-500">When</dt>
            <dd className="mt-0.5 font-medium">{formatWindow(b.startsAt, b.endsAt)}</dd>
          </div>
          {b.checkedInAt && (
            <div>
              <dt className="text-slate-500">Actual use</dt>
              <dd className="mt-0.5 font-medium">
                Picked up {timeAgo(b.checkedInAt)}
                {b.checkedOutAt
                  ? `, returned ${timeAgo(b.checkedOutAt)}${late > 0 ? ` (${formatLate(late)} late)` : " on time"}`
                  : ""}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500">Requested by</dt>
            <dd className="mt-0.5 font-medium">
              {b.requester.name} · {b.requester.department}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Purpose</dt>
            <dd className="mt-0.5 whitespace-pre-line">{b.purpose || "—"}</dd>
          </div>
          {b.decisionReason && (
            <div>
              <dt className="text-slate-500">Decision{b.manager ? ` by ${b.manager.name}` : ""}</dt>
              <dd className="mt-0.5">{b.decisionReason}</dd>
            </div>
          )}
        </dl>
      </Card>

      {b.conditionReports.length > 0 && <ConditionReports reports={b.conditionReports} />}

      {(b.incidents.length > 0 || canReport) && (
        <section id="incidents" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Incidents</h2>
            {canReport && <IncidentPanel bookingId={b.id} />}
          </div>
          {b.incidents.length === 0 ? (
            <p className="text-sm text-slate-500">No incidents reported for this booking.</p>
          ) : (
            <ul className="space-y-3">
              {b.incidents.map((incident, i) => (
                <IncidentCard key={incident.id} incident={incident} index={i} />
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/resources/${b.resource.id}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100"
        >
          View resource
        </Link>
        {mine && <BookingActions id={b.id} resourceId={b.resource.id} status={b.status} />}
      </div>
    </div>
  );
}
