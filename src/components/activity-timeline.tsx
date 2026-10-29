import { describeAudit, type AuditTone } from "@/lib/audit-describe";
import { formatInstant, timeAgo } from "@/lib/format";

type Entry = {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: Date;
  actor: { name: string; role: string } | null;
};

const DOT: Record<AuditTone, string> = {
  good: "bg-emerald-500",
  bad: "bg-rose-500",
  warn: "bg-amber-500",
  info: "bg-indigo-500",
  neutral: "bg-slate-400",
};

// A vertical history both parties can replay: what happened, who did it, and when.
export function ActivityTimeline({
  entries,
  empty = "Nothing has happened yet.",
}: {
  entries: Entry[];
  empty?: string;
}) {
  if (entries.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;

  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
      {entries.map((e, i) => {
        const view = describeAudit(e.action, e.metadata as Record<string, unknown> | null);
        return (
          <li
            key={e.id}
            className="animate-fade-up relative"
            style={{ "--i": Math.min(i, 14) } as React.CSSProperties}
          >
            <span
              aria-hidden
              className={`absolute -left-[1.95rem] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${DOT[view.tone]}`}
            />
            <p className="text-sm font-medium text-slate-900">{view.label}</p>
            {view.detail && <p className="text-sm text-slate-600">{view.detail}</p>}
            <p className="text-xs text-slate-500">
              {e.actor ? `${e.actor.name} (${e.actor.role.toLowerCase()})` : "System"} ·{" "}
              <time dateTime={e.createdAt.toISOString()} title={formatInstant(e.createdAt)}>
                {formatInstant(e.createdAt)}
              </time>{" "}
              · {timeAgo(e.createdAt)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
