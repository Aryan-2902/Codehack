import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadIncidents } from "@/lib/incidents";
import { formatWindow } from "@/lib/format";
import { IncidentCard } from "@/components/incident-card";
import { ResolveIncidentForm } from "@/components/resolve-incident-form";

export const metadata = { title: "Incidents · Campus Lab Share" };

export default async function IncidentsPage() {
  const user = await requireUser();
  const incidents = await loadIncidents(user);
  const reviewer = user.role === "MANAGER" || user.role === "ADMIN";

  const sections = [
    { title: reviewer ? "Needs review" : "Open", rows: incidents.filter((i) => i.status === "OPEN") },
    { title: "Resolved", rows: incidents.filter((i) => i.status === "RESOLVED") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Incidents</h1>
        <p className="mt-1 text-sm text-slate-600">
          {reviewer
            ? "Damage, delay and scheduling reports. You review each one and decide the outcome; nothing is penalised automatically."
            : "Incidents you filed or that involve your bookings and resources."}
        </p>
      </div>

      {incidents.length === 0 ? (
        <div className="animate-pop-in rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-medium text-slate-700">No incidents.</p>
          <p className="mt-1 text-sm text-slate-500">
            Report one from a booking page if something goes wrong.
          </p>
        </div>
      ) : (
        sections.map((s) => (
          <section key={s.title} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {s.title}
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                {s.rows.length}
              </span>
            </h2>
            {s.rows.length === 0 ? (
              <p className="animate-fade-in rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                Nothing here.
              </p>
            ) : (
              <ul className="space-y-4">
                {s.rows.map((i, n) => (
                  <IncidentCard
                    key={i.id}
                    incident={i}
                    index={n}
                    context={
                      <p className="text-sm text-slate-600">
                        <Link href={`/bookings/${i.booking.id}`} className="font-medium text-indigo-700 hover:underline">
                          {i.booking.resource.name}
                        </Link>{" "}
                        · {i.booking.requester.name} · {formatWindow(i.booking.startsAt, i.booking.endsAt)}
                      </p>
                    }
                    actions={reviewer && i.status === "OPEN" ? <ResolveIncidentForm incidentId={i.id} /> : undefined}
                  />
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
