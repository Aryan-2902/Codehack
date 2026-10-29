export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="skeleton h-64 w-full" />
    </div>
  );
}
