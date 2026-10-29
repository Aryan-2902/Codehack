import { formatDate, timeAgo } from "@/lib/format";

type Incident = {
  id: string;
  type: "DAMAGE" | "DELAY" | "CONFLICT";
  description: string;
  photos: string[];
  status: "OPEN" | "RESOLVED";
  createdAt: Date;
  reporter: { name: string };
  resolution: string | null;
  resolvedBy: { name: string } | null;
  resolvedAt: Date | null;
  suspensionDays: number | null;
};

const TYPE_LABELS = { DAMAGE: "Damage", DELAY: "Delay", CONFLICT: "Scheduling conflict" };
const TYPE_STYLES = {
  DAMAGE: "bg-rose-100 text-rose-800",
  DELAY: "bg-amber-100 text-amber-800",
  CONFLICT: "bg-violet-100 text-violet-800",
};

// One incident, shown the same way to both parties and to the managers who resolve it.
export function IncidentCard({
  incident: i,
  context,
  actions,
  index = 0,
}: {
  incident: Incident;
  context?: React.ReactNode;
  actions?: React.ReactNode;
  index?: number;
}) {
  return (
    <li
      className="animate-fade-up space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      style={{ "--i": Math.min(index, 10) } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[i.type]}`}>
          {TYPE_LABELS[i.type]}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            i.status === "OPEN" ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {i.status === "OPEN" ? "Awaiting review" : "Resolved"}
        </span>
        <span className="text-xs text-slate-500">
          Reported by {i.reporter.name} · {timeAgo(i.createdAt)}
        </span>
      </div>
      {context}
      <p className="whitespace-pre-line text-sm text-slate-700">{i.description}</p>
      {i.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {i.photos.map((id) => (
            <a key={id} href={`/api/photos/${id}`} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${id}`}
                alt="Incident photo"
                className="h-20 w-20 object-cover transition duration-300 group-hover:scale-110"
              />
            </a>
          ))}
        </div>
      )}
      {i.status === "RESOLVED" && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm">
          <p className="font-medium text-emerald-900">
            Resolved by {i.resolvedBy?.name ?? "a manager"}
            {i.resolvedAt ? ` on ${formatDate(i.resolvedAt)}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-line text-emerald-900">{i.resolution}</p>
          {i.suspensionDays ? (
            <p className="mt-1 font-medium text-amber-800">
              Penalty: booking suspended for {i.suspensionDays} day{i.suspensionDays === 1 ? "" : "s"}.
            </p>
          ) : (
            <p className="mt-1 text-emerald-800">No penalty applied.</p>
          )}
        </div>
      )}
      {actions}
    </li>
  );
}
