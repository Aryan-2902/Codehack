import type { Check } from "@/lib/eligibility";

// Renders each rule as it was evaluated: a tick when it passed, or the reason it failed.
export function EvaluationChecklist({ checks }: { checks: Check[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((c, i) => (
        <li
          key={c.key}
          className={`animate-fade-up flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
            c.ok ? "border-emerald-100 bg-emerald-50/60" : "border-rose-200 bg-rose-50"
          }`}
          style={{ "--i": i } as React.CSSProperties}
        >
          <span
            aria-hidden
            className={`animate-pop-in mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${
              c.ok ? "bg-emerald-500" : "bg-rose-500"
            }`}
            style={{ "--i": i + 2 } as React.CSSProperties}
          >
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {c.ok ? <path d="m4 10 4 4 8-8" /> : <path d="m5 5 10 10M15 5 5 15" />}
            </svg>
          </span>
          <div className="text-sm">
            <p className={c.ok ? "font-medium text-emerald-900" : "font-medium text-rose-900"}>
              {c.label}
            </p>
            {!c.ok && c.message && <p className="mt-0.5 text-rose-700">{c.message}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
