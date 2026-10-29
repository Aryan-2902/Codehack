export default function AuditLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="skeleton h-20 w-full" />
      <div className="skeleton h-96 w-full" />
    </div>
  );
}
