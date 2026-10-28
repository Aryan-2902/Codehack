export function VerificationBadges({
  verified,
  safetyTrained,
}: {
  verified: boolean;
  safetyTrained: boolean;
}) {
  const item = (on: boolean, label: string) => (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        on ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
      }`}
    >
      {on ? "✓ " : "✗ "}
      {label}
    </span>
  );
  return (
    <span className="flex flex-wrap gap-2">
      {item(verified, "ID verified")}
      {item(safetyTrained, "Safety training")}
    </span>
  );
}
