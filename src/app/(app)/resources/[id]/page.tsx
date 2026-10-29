import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { checkEligibility } from "@/lib/eligibility";
import { loadResourceHistory } from "@/lib/audit-log";
import { canEditResource, canViewResource, resourceInclude } from "@/lib/resources";
import {
  CATEGORY_LABELS,
  DAY_NAMES,
  STATUS_LABELS,
  formatDate,
  minuteToTime,
} from "@/lib/format";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CategoryArt } from "@/components/category-art";
import { Card } from "@/components/ui";

export default async function ResourceDetailPage({ params }: PageProps<"/resources/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const r = await db.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!r || !canViewResource(user, r)) notFound();

  const grant = await db.eligibilityGrant.findUnique({
    where: { userId_resourceId: { userId: user.id, resourceId: r.id } },
    select: { id: true },
  });
  const eligibility = checkEligibility(user, r, Boolean(grant));
  const editable = canEditResource(user, r);
  const history = editable ? await loadResourceHistory(r.id) : [];

  const conditions = [
    r.allowedRoles.length > 0 && `Open to: ${r.allowedRoles.map((x) => x.toLowerCase()).join(", ")}`,
    r.allowedDepartments.length > 0 && `Departments: ${r.allowedDepartments.join(", ")}`,
    r.requiresVerified && "ID verification required",
    r.requiresSafetyTraining && "Safety training required",
    r.requiresEligibilityGrant && "Per-equipment approval required (e.g. induction)",
    r.requiresSupervision && "Supervision required during use",
    r.depositRequired && `Deposit: ₹${r.depositAmount}`,
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/resources" className="text-sm text-indigo-600 hover:underline">
        ← All resources
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{r.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {CATEGORY_LABELS[r.category]} · {r.location} · Owner: {r.owner.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              r.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {STATUS_LABELS[r.status]}
          </span>
          {editable && (
            <Link
              href={`/resources/${r.id}/edit`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {r.photos.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto">
          {r.photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-48 rounded-lg object-cover" />
          ))}
        </div>
      ) : (
        <CategoryArt category={r.category} className="h-40 rounded-xl" />
      )}

      {r.ownerId !== user.id && (
        <div className="animate-fade-up flex flex-wrap items-center gap-3">
          {r.status === "ACTIVE" && eligibility.eligible ? (
            <Link
              href={`/resources/${r.id}/book`}
              className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/30 transition hover:-translate-y-0.5 hover:bg-indigo-700 active:scale-95"
            >
              Request booking
            </Link>
          ) : (
            <span
              aria-disabled
              className="cursor-not-allowed rounded-md bg-slate-200 px-5 py-2.5 font-medium text-slate-500"
            >
              Request booking
            </span>
          )}
          {r.status !== "ACTIVE" ? (
            <p className="text-sm text-slate-600">Not open for booking right now.</p>
          ) : (
            !eligibility.eligible && (
              <p className="text-sm text-slate-600">
                Meet the requirements under &ldquo;Who can book&rdquo; to request this resource.
              </p>
            )
          )}
        </div>
      )}

      <Card>
        <p className="whitespace-pre-line text-slate-700">{r.description}</p>
        {r.conditionAtListing && (
          <p className="mt-3 text-sm text-slate-500">
            Condition at listing: <span className="text-slate-700">{r.conditionAtListing}</span>
          </p>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Who can book</h2>
          {conditions.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">Anyone with an account.</p>
          )}
          {r.ownerId !== user.id && (
            <div
              className={`mt-4 rounded-md p-3 text-sm ${
                eligibility.eligible ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
              }`}
            >
              {eligibility.eligible ? (
                "You meet the access conditions for this resource."
              ) : (
                <>
                  <p className="font-medium">You don&apos;t meet every condition yet:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {eligibility.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Usage rules</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Max booking length</dt>
              <dd className="font-medium">{r.maxBookingHours} h</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Max concurrent bookings</dt>
              <dd className="font-medium">{r.maxConcurrentBookings} per user</dd>
            </div>
            <div>
              <dt className="text-slate-500">Return it</dt>
              <dd className="mt-0.5 font-medium">{r.expectedReturnCondition}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Availability</h2>
        {r.slots.length ? (
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {r.slots.map((s) => (
              <li key={s.id} className="flex justify-between rounded bg-slate-50 px-3 py-1.5">
                <span>{DAY_NAMES[s.dayOfWeek]}</span>
                <span className="font-medium">
                  {minuteToTime(s.startMinute)} – {minuteToTime(s.endMinute)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">No open slots have been set.</p>
        )}
        {r.blackouts.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <h3 className="mb-2 text-sm font-medium text-slate-700">Unavailable dates</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              {r.blackouts.map((b) => (
                <li key={b.id}>
                  {formatDate(b.date)}
                  {b.reason && ` – ${b.reason}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {editable && (
        <Card>
          <h2 className="mb-3 font-semibold">Listing history</h2>
          <ActivityTimeline entries={history} empty="No changes recorded yet." />
        </Card>
      )}
    </div>
  );
}
