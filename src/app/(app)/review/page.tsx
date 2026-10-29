import { requireUser } from "@/lib/auth";
import { loadReviewQueue } from "@/lib/review";
import { ReviewCard } from "@/components/review-card";

export const metadata = { title: "Review · Campus Lab Share" };

export default async function ReviewPage() {
  const user = await requireUser(["OWNER", "MANAGER", "ADMIN"]);
  const items = await loadReviewQueue(user);

  const sections = [
    {
      title: "Needs a decision",
      empty: "No requests are waiting for you.",
      rows: items.filter((i) => i.status === "PENDING"),
    },
    {
      title: "Waitlist",
      empty: "Nobody is on a waitlist.",
      rows: items.filter((i) => i.status === "WAITLISTED"),
    },
    {
      title: "Approved and in use",
      empty: "No approved or in-use bookings.",
      rows: items.filter((i) => i.status === "APPROVED" || i.status === "CHECKED_IN"),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Review requests</h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.role === "OWNER"
            ? "Requests for the resources you own."
            : "Requests across all resources."}{" "}
          Competing requests for the same slot are shown together.
        </p>
      </div>

      {sections.map((s) => (
        <section key={s.title} className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {s.title}
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
              {s.rows.length}
            </span>
          </h2>
          {s.rows.length === 0 ? (
            <p className="animate-fade-in rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              {s.empty}
            </p>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {s.rows.map((item, i) => (
                <ReviewCard key={item.id} item={item} index={i} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
