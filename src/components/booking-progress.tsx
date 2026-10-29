const STEPS = ["Requested", "Approved", "In use", "Returned"];
const STEP_OF: Record<string, number> = {
  PENDING: 0,
  WAITLISTED: 0,
  APPROVED: 1,
  CHECKED_IN: 2,
  COMPLETED: 3,
};

// Where a booking is in its life. Rejected or cancelled bookings show a plain end state instead.
export function BookingProgress({ status, overdue }: { status: string; overdue?: boolean }) {
  const step = STEP_OF[status];
  if (step === undefined) return null;

  return (
    <ol className="relative flex items-start justify-between" aria-label="Booking progress">
      <div aria-hidden className="absolute inset-x-5 top-4 h-0.5 bg-slate-200">
        <div
          className="animate-fill h-full bg-indigo-500"
          style={{ "--w": `${(step / (STEPS.length - 1)) * 100}%` } as React.CSSProperties}
        />
      </div>
      {STEPS.map((label, i) => {
        const done = i < step || status === "COMPLETED";
        const current = i === step && status !== "COMPLETED";
        const warn = current && overdue;
        return (
          <li key={label} className="relative z-10 flex flex-col items-center gap-1">
            <span
              className={`animate-pop-in flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                warn
                  ? "bg-rose-500 text-white ring-4 ring-rose-100"
                  : done
                    ? "bg-indigo-500 text-white"
                    : current
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                      : "bg-slate-200 text-slate-500"
              }`}
              style={{ "--i": i } as React.CSSProperties}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-xs ${done || current ? "font-medium text-slate-900" : "text-slate-500"}`}>
              {warn ? "Overdue" : label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
