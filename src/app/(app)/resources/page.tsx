import Link from "next/link";
import { Suspense } from "react";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { parseSearch, type ResourceSearch } from "@/lib/availability";
import { searchResources } from "@/lib/search";
import { ResourceCard } from "@/components/resource-card";
import { ResourceGridSkeleton } from "@/components/resource-skeleton";
import { ResourceMatcher } from "@/components/resource-matcher";
import { SearchFilters } from "@/components/search-filters";

export const metadata = { title: "Resources · Campus Lab Share" };

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  const user = await requireUser();
  const search = parseSearch(await searchParams);
  const canList = user.role === "OWNER" || user.role === "ADMIN";

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
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-px hover:bg-indigo-700 active:scale-95"
          >
            New listing
          </Link>
        )}
      </div>

      <ResourceMatcher />

      <SearchFilters initial={search} />

      {/* Re-keyed on every search so the skeleton shows while new results stream in. */}
      <Suspense key={JSON.stringify(search)} fallback={<ResourceGridSkeleton />}>
        <Results user={user} search={search} />
      </Suspense>
    </div>
  );
}

async function Results({ user, search }: { user: CurrentUser; search: ResourceSearch }) {
  const resources = await searchResources(user, search);
  const filtered = Object.keys(search).length > 0;

  if (resources.length === 0) {
    return (
      <div className="animate-pop-in rounded-xl border border-dashed border-slate-300 p-10 text-center">
        <p className="font-medium text-slate-700">
          {filtered ? "No resources match those filters." : "No resources have been listed yet."}
        </p>
        {filtered && (
          <Link
            href="/resources"
            className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
          >
            Clear all filters
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="animate-fade-in text-sm text-slate-500">
        {resources.length} {resources.length === 1 ? "resource" : "resources"}
        {filtered && " found"}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r, i) => (
          <ResourceCard key={r.id} resource={r} index={i} />
        ))}
      </ul>
    </div>
  );
}
