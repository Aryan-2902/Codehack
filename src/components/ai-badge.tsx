// Every AI (or rule-based) output is labelled as a suggestion, and says which kind it is.
export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="currentColor">
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6-5.6-1.9 5.6-1.9L12 2.5z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" opacity=".7" />
    </svg>
  );
}

export function AiBadge({ mode }: { mode: "ai" | "basic" }) {
  return mode === "ai" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-100 to-violet-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
      <Sparkle className="animate-bob text-violet-600" />
      AI suggestion
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
      Basic suggestion
    </span>
  );
}
