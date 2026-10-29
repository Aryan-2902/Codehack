import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { describeAudit } from "@/lib/audit-describe";
import { csvCell, exportAudit, searchAudit } from "@/lib/audit-log";

// Platform-wide history for admins. ?group= booking|incident|resource|user, ?q= text, ?page=,
// and ?format=csv to download everything that matches.
export const GET = handle(async (req: Request) => {
  const admin = await requireApiUser(["ADMIN"]);
  const params = new URL(req.url).searchParams;
  const query = {
    group: params.get("group") ?? undefined,
    q: params.get("q") ?? undefined,
    page: Number(params.get("page")) || 1,
  };

  if (params.get("format") === "csv") {
    const rows = await exportAudit(query);
    // Exporting the log is itself sensitive, so it is recorded.
    await audit({
      actorId: admin.id,
      action: "audit.exported",
      targetType: "Audit",
      targetId: "csv",
      metadata: { filter: [query.group, query.q].filter(Boolean).join(" / ") || "everything", rows: rows.length },
    });
    const header = ["time", "actor", "role", "action", "summary", "targetType", "targetId"];
    const lines = rows.map((r) => {
      const v = describeAudit(r.action, r.metadata as Record<string, unknown> | null);
      return [
        r.createdAt.toISOString(),
        r.actor?.name ?? "System",
        r.actor?.role ?? "",
        r.action,
        [v.label, v.detail].filter(Boolean).join(": "),
        r.targetType,
        r.targetId,
      ]
        .map(csvCell)
        .join(",");
    });
    return new Response([header.join(","), ...lines].join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="audit-log.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  }

  const result = await searchAudit(query);
  return NextResponse.json({
    ...result,
    entries: result.entries.map((e) => ({
      ...e,
      summary: describeAudit(e.action, e.metadata as Record<string, unknown> | null),
    })),
  });
});
