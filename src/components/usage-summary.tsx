import { FAIR_USAGE, FAIR_USAGE_SUMMARY } from "@/lib/fair-usage";
import { formatInstant } from "@/lib/format";

// Where the signed-in user stands against the fair-usage limits, with any active cooldowns.
export function UsageSummary({
  active,
  cooldowns,
}: {
  active: number;
  cooldowns: { resource: string; until: Date; reason: "cancelled" | "no_show" }[];
}) {
  const max = FAIR_USAGE.maxActiveBookings;
  const full = active >= max;

  return (
    <section className="animate-fade-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Your fair-usage status</h2>
        <span className={`text-sm font-medium ${full ? "text-amber-700" : "text-slate-600"}`}>
          {active} of {max} active bookings
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(active, max)}
      >
        <div
          className={`animate-fill h-full rounded-full ${full ? "bg-amber-500" : "bg-indigo-500"}`}
          style={{ "--w": `${Math.min(100, (active / max) * 100)}%` } as React.CSSProperties}
        />
      </div>
      {full && (
        <p className="mt-2 text-sm text-amber-800">
          You&apos;re at the limit. Finish or cancel a booking before requesting another.
        </p>
      )}
      {cooldowns.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {cooldowns.map((c) => (
            <li
              key={c.resource}
              className="animate-pop-in rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-900"
            >
              <strong>{c.resource}</strong>: {c.reason === "no_show" ? "missed booking" : "cancelled booking"}.
              You can request it again after {formatInstant(c.until)}.
            </li>
          ))}
        </ul>
      )}
      <details className="mt-3 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-indigo-700">How fair usage works</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {FAIR_USAGE_SUMMARY.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
