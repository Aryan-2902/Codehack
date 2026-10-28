import Link from "next/link";
import { CategoryArt } from "@/components/category-art";
import type { ResourceResult } from "@/lib/search";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/format";

export function ResourceCard({ resource: r, index }: { resource: ResourceResult; index: number }) {
  return (
    <li
      className="animate-fade-up"
      style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
    >
      <Link
        href={`/resources/${r.id}`}
        className="group block h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
      >
        <div className="h-36 overflow-hidden">
          {r.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.photos[0]}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            />
          ) : (
            <CategoryArt
              category={r.category}
              className="h-full w-full transition duration-500 group-hover:scale-110"
            />
          )}
        </div>
        <div className="space-y-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold">{r.name}</h2>
            {r.status !== "ACTIVE" && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {STATUS_LABELS[r.status]}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {CATEGORY_LABELS[r.category]} · {r.location}
          </p>
          <p className="line-clamp-2 text-sm text-slate-600">{r.description}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-xs text-slate-500">Owner: {r.owner.name}</p>
            {r.eligibility &&
              (r.eligibility.eligible ? (
                <span className="animate-pop-in rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  ✓ You&apos;re eligible
                </span>
              ) : (
                <span
                  title={r.eligibility.reasons.join("\n")}
                  className="animate-pop-in rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                >
                  Requirements not met
                </span>
              ))}
          </div>
        </div>
      </Link>
    </li>
  );
}
