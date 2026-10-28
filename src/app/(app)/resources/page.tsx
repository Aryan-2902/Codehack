import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/format";

export const metadata = { title: "Resources · Campus Lab Share" };

export default async function ResourcesPage() {
  const user = await requireUser();
  const canList = user.role === "OWNER" || user.role === "ADMIN";

  const resources = await db.resource.findMany({
    where:
      user.role === "ADMIN"
        ? undefined
        : { OR: [{ status: { not: "RETIRED" } }, { ownerId: user.id }] },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Resources</h1>
          <p className="mt-1 text-sm text-slate-600">
            Equipment and spaces available to share across campus.
          </p>
        </div>
        {canList && (
          <Link
            href="/resources/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            New listing
          </Link>
        )}
      </div>

      {resources.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No resources have been listed yet.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r, i) => (
            <li
              key={r.id}
              className="animate-fade-up"
              style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
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
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm text-slate-400 transition duration-500 group-hover:scale-110">
                      No photo
                    </div>
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
                  <p className="pt-1 text-xs text-slate-500">Owner: {r.owner.name}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
