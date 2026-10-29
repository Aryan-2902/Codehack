export default function IncidentsLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="skeleton h-40 w-full" />
      ))}
    </div>
  );
}
