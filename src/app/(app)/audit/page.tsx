import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AUDIT_GROUPS, describeAudit, type AuditTone } from "@/lib/audit-describe";
import { AUDIT_PAGE_SIZE, searchAudit, targetHref } from "@/lib/audit-log";
import { formatInstant } from "@/lib/format";
import { Button } from "@/components/ui";

export const metadata = { title: "Audit log · Campus Lab Share" };

const DOT: Record<AuditTone, string> = {
  good: "bg-emerald-500",
  bad: "bg-rose-500",
  warn: "bg-amber-500",
  info: "bg-indigo-500",
  neutral: "bg-slate-400",
};

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  await requireUser(["ADMIN"]);
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const group = AUDIT_GROUPS.some(([key]) => key === pick(sp.group)) ? pick(sp.group) : "all";
  const q = pick(sp.q)?.slice(0, 100) ?? "";
  const requested = Math.max(1, Number(pick(sp.page)) || 1);

  const { entries, total, page, pages } = await searchAudit({ group, q, page: requested });

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (group && group !== "all") params.set("group", group);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/audit?${qs}` : "/audit";
  };
  const csv = new URLSearchParams({ format: "csv", ...(group !== "all" && group ? { group } : {}), ...(q ? { q } : {}) });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Audit log</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every state change across the platform: who did what, and when.
          </p>
        </div>
        <a
          href={`/api/audit?${csv}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:-translate-y-px hover:bg-slate-100"
        >
          Export CSV
        </a>
      </div>

      <form
        method="get"
        className="animate-fade-up flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="text-sm font-medium text-slate-700">
          Type
          <select
            name="group"
            defaultValue={group}
            className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            {AUDIT_GROUPS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-48 flex-1 text-sm font-medium text-slate-700">
          Search by person or action
          <input
            name="q"
            defaultValue={q}
            placeholder="e.g. Aarav, approved, role"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <Button type="submit">Apply</Button>
        {(group !== "all" || q) && (
          <Link href="/audit" className="px-2 py-2 text-sm text-indigo-600 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <p className="text-sm text-slate-500">
        {total} {total === 1 ? "entry" : "entries"}
        {total > AUDIT_PAGE_SIZE && ` · page ${page} of ${pages}`}
      </p>

      {entries.length === 0 ? (
        <div className="animate-pop-in rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600">
          Nothing matches those filters.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {entries.map((e, i) => {
            const v = describeAudit(e.action, e.metadata as Record<string, unknown> | null);
            const link = targetHref(e.targetType, e.targetId);
            return (
              <li
                key={e.id}
                className="animate-fade-up flex items-start gap-3 px-5 py-3.5"
                style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
              >
                <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[v.tone]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium text-slate-900">{v.label}</span>
                    {v.detail && <span className="text-slate-600"> · {v.detail}</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {e.actor ? `${e.actor.name} (${e.actor.role.toLowerCase()})` : "System"} ·{" "}
                    {formatInstant(e.createdAt)} · <span className="font-mono">{e.action}</span>
                  </p>
                </div>
                {link && (
                  <Link href={link} className="shrink-0 text-xs font-medium text-indigo-600 hover:underline">
                    View {e.targetType === "Resource" ? "listing" : "booking"}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link href={href(page - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 transition hover:bg-slate-100">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {page < pages && (
            <Link href={href(page + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 transition hover:bg-slate-100">
              Older →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
