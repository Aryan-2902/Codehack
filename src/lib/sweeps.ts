import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { instantToLocal, minuteToTime } from "@/lib/format";
import { managerIds, notify } from "@/lib/notifications";
import { REMINDER_LEAD_MINUTES } from "@/lib/checkin-rules";

// There is no background worker, so time-based events are raised lazily: whenever a signed-in
// page loads, anything that has become overdue or is about to start is flagged exactly once.
// (A hosted cron could call runScheduledChecks(true) as well; the once-only flags make that safe.)
let lastRun = 0;

export async function runScheduledChecks(force = false) {
  const now = Date.now();
  if (!force && now - lastRun < 30_000) return;
  lastRun = now;
  await Promise.all([flagOverdue(), sendReminders()]);
}

/** In use past the booked window with no check-out: flag it, tell everyone involved. */
async function flagOverdue() {
  const due = await db.bookingRequest.findMany({
    where: { status: "CHECKED_IN", endsAt: { lt: new Date() }, overdueFlaggedAt: null },
    include: {
      resource: { select: { name: true, ownerId: true } },
      requester: { select: { name: true } },
    },
  });
  if (due.length === 0) return;
  const managers = await managerIds();

  for (const b of due) {
    // Claim it first, so concurrent page loads can't raise the same flag twice.
    const claimed = await db.bookingRequest.updateMany({
      where: { id: b.id, overdueFlaggedAt: null },
      data: { overdueFlaggedAt: new Date() },
    });
    if (claimed.count === 0) continue;

    await audit({
      actorId: null,
      action: "booking.overdue_flagged",
      targetType: "BookingRequest",
      targetId: b.id,
      metadata: { dueAt: b.endsAt.toISOString() },
    });
    const link = `/bookings/${b.id}`;
    await notify([
      {
        userId: b.requesterId,
        message: `${b.resource.name} is overdue. Please return it and check out as soon as you can.`,
        link,
        kind: "overdue",
      },
      ...[...new Set([b.resource.ownerId, ...managers])].map((userId) => ({
        userId,
        message: `${b.requester.name} has not returned ${b.resource.name} (overdue).`,
        link,
        kind: "overdue" as const,
      })),
    ]);
  }
}

/** Approved bookings starting within the hour get a single reminder. */
async function sendReminders() {
  const now = new Date();
  const soon = new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60_000);
  const upcoming = await db.bookingRequest.findMany({
    where: { status: "APPROVED", reminderSentAt: null, startsAt: { gt: now, lte: soon } },
    include: { resource: { select: { name: true } } },
  });

  for (const b of upcoming) {
    const claimed = await db.bookingRequest.updateMany({
      where: { id: b.id, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const at = minuteToTime(instantToLocal(b.startsAt).minute);
    await notify([
      {
        userId: b.requesterId,
        message: `Reminder: your booking for ${b.resource.name} starts at ${at}.`,
        link: `/bookings/${b.id}`,
        kind: "reminder",
      },
    ]);
  }
}
