// Illustrated fallback shown when a listing has no photos. Real photos replace it automatically.
const ART: Record<string, { gradient: string; color: string; icon: React.ReactNode }> = {
  WORKSHOP_TOOL: {
    gradient: "from-amber-100 via-orange-100 to-amber-200",
    color: "text-amber-600",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="7" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
      </>
    ),
  },
  LAB_INSTRUMENT: {
    gradient: "from-indigo-100 via-sky-100 to-indigo-200",
    color: "text-indigo-600",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M5.5 11H8l1.5-4 3 8 2-4h3.5M8 21h8M12 17v4" />
      </>
    ),
  },
  BOOKABLE_SPACE: {
    gradient: "from-emerald-100 via-teal-100 to-emerald-200",
    color: "text-emerald-600",
    icon: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />,
  },
};

export function CategoryArt({
  category,
  className = "",
}: {
  category: string;
  className?: string;
}) {
  const art = ART[category] ?? ART.WORKSHOP_TOOL;
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center bg-gradient-to-br ${art.gradient} ${art.color} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="animate-bob h-14 w-14 opacity-80"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {art.icon}
      </svg>
    </div>
  );
}
