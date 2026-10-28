export default function AppLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton h-4 w-80" />
      <div className="skeleton h-40 w-full" />
    </div>
  );
}
