import { ResourceGridSkeleton } from "@/components/resource-skeleton";

export default function ResourcesLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-4 w-72" />
      </div>
      <div className="skeleton h-28 w-full" />
      <ResourceGridSkeleton />
    </div>
  );
}
