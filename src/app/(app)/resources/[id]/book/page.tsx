import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bookingFormValues } from "@/lib/bookings";
import { canViewResource, resourceInclude } from "@/lib/resources";
import { instantToLocal, minuteToTime, toDateInput } from "@/lib/format";
import { BookingWizard } from "@/components/booking-wizard";

export const metadata = { title: "Request booking · Campus Lab Share" };

export default async function BookResourcePage({
  params,
  searchParams,
}: PageProps<"/resources/[id]/book">) {
  const user = await requireUser();
  const { id } = await params;
  const { draft } = await searchParams;

  const r = await db.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!r || !canViewResource(user, r)) notFound();
  if (r.ownerId === user.id) redirect(`/resources/${id}`);

  // Resuming a saved draft pre-fills the form.
  const saved =
    typeof draft === "string"
      ? await db.bookingRequest.findFirst({
          where: { id: draft, requesterId: user.id, resourceId: id, status: "DRAFT" },
        })
      : null;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/resources/${r.id}`} className="text-sm text-indigo-600 hover:underline">
        ← Back to {r.name}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Request {r.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {r.location} · Owner: {r.owner.name}
        </p>
      </div>

      {r.status !== "ACTIVE" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          This resource isn&apos;t open for booking right now.
        </p>
      ) : (
        <BookingWizard
          resource={{
            id: r.id,
            name: r.name,
            maxBookingHours: r.maxBookingHours,
            maxConcurrentBookings: r.maxConcurrentBookings,
            slots: r.slots.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              start: minuteToTime(s.startMinute),
              end: minuteToTime(s.endMinute),
            })),
            blackouts: r.blackouts.map((b) => ({
              date: toDateInput(b.date),
              reason: b.reason,
            })),
          }}
          today={instantToLocal(new Date()).date}
          draft={saved ? { id: saved.id, values: bookingFormValues(saved) } : undefined}
        />
      )}
    </div>
  );
}
