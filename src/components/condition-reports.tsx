import { CONDITION_LABELS, conditionChange, type ConditionRating } from "@/lib/checkin-rules";
import { timeAgo } from "@/lib/format";

type Report = {
  id: string;
  stage: "CHECK_IN" | "CHECK_OUT";
  condition: ConditionRating;
  notes: string;
  photos: string[];
  createdAt: Date;
  reporter: { name: string };
};

const RATING_BADGE: Record<ConditionRating, string> = {
  GOOD: "bg-emerald-100 text-emerald-800",
  MINOR_ISSUES: "bg-amber-100 text-amber-800",
  DAMAGED: "bg-rose-100 text-rose-800",
};

function Column({ title, report, index }: { title: string; report?: Report; index: number }) {
  return (
    <div
      className="animate-fade-up space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {report && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RATING_BADGE[report.condition]}`}>
            {CONDITION_LABELS[report.condition]}
          </span>
        )}
      </div>
      {report ? (
        <>
          <p className="whitespace-pre-line text-sm text-slate-700">{report.notes}</p>
          {report.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {report.photos.map((id) => (
                <a key={id} href={`/api/photos/${id}`} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/${id}`}
                    alt={`${title} condition photo`}
                    className="h-28 w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">
            {report.reporter.name} · {timeAgo(report.createdAt)}
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-500">Not recorded yet.</p>
      )}
    </div>
  );
}

// Side-by-side "before" and "after" so any change in condition is obvious.
export function ConditionReports({ reports }: { reports: Report[] }) {
  const before = [...reports].reverse().find((r) => r.stage === "CHECK_IN");
  const after = [...reports].reverse().find((r) => r.stage === "CHECK_OUT");
  const change = before && after ? conditionChange(before.condition, after.condition) : null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Condition reports</h2>
        {change === "worse" && (
          <span className="animate-pop-in rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
            Condition changed: worse than at pick-up
          </span>
        )}
        {change === "better" && (
          <span className="animate-pop-in rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            Better than at pick-up
          </span>
        )}
        {change === "same" && (
          <span className="animate-pop-in rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            Unchanged since pick-up
          </span>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Column title="At pick-up" report={before} index={0} />
        <Column title="At return" report={after} index={1} />
      </div>
    </section>
  );
}
