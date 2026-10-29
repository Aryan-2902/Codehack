import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { describeAudit } from "@/lib/audit-describe";
import { loadBookingTimeline } from "@/lib/audit-log";
import { loadPartyBooking } from "@/lib/bookings";

type Ctx = { params: Promise<{ id: string }> };

// The full history of one booking. Visible to exactly who can see the booking:
// the requester, the resource owner, managers and admins.
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  await loadPartyBooking(user, id);

  const entries = await loadBookingTimeline(id);
  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      action: e.action,
      actor: e.actor?.name ?? "System",
      createdAt: e.createdAt,
      ...describeAudit(e.action, e.metadata as Record<string, unknown> | null),
    })),
  });
});
