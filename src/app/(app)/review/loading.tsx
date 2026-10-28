export default function ReviewLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="skeleton h-8 w-52" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
