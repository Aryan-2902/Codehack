import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { waitlistPosition } from "@/lib/approvals";
import { canViewBooking } from "@/lib/bookings";
import { CATEGORY_LABELS, formatWindow } from "@/lib/format";
import { BookingActions } from "@/components/booking-actions";
import { BookingStatusBadge } from "@/components/booking-status";
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
    },
  });
  if (!b || !canViewBooking(user, b)) notFound();
  const mine = b.requesterId === user.id;
  const position = b.status === "WAITLISTED" ? await waitlistPosition(b) : null;

  return (
    <div className="max-w-2xl space-y-6">
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
          <BookingStatusBadge status={b.status} />
        </div>
      </div>

      <Card>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-slate-500">When</dt>
            <dd className="mt-0.5 font-medium">{formatWindow(b.startsAt, b.endsAt)}</dd>
          </div>
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
              <dt className="text-slate-500">
                Decision{b.manager ? ` by ${b.manager.name}` : ""}
              </dt>
              <dd className="mt-0.5">{b.decisionReason}</dd>
            </div>
          )}
        </dl>
      </Card>

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
