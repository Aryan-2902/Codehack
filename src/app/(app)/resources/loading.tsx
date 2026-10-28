export default function ResourcesLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="skeleton h-36 rounded-none" />
            <div className="space-y-2 p-4">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
