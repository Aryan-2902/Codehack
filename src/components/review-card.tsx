"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ErrorText } from "@/components/ui";
import { BookingStatusBadge } from "@/components/booking-status";
import { BOOKING_STATUS_LABELS, formatWindow } from "@/lib/format";
import type { ReviewItem } from "@/lib/review";

type Action = "approve" | "reject" | "waitlist" | "cancel";

const OUTCOMES: Record<Action, { text: string; style: string }> = {
  approve: { text: "Approved ✓ The requester has been notified.", style: "bg-emerald-50 text-emerald-800" },
  reject: { text: "Rejected. The requester has been notified with your reason.", style: "bg-rose-50 text-rose-800" },
  waitlist: { text: "Added to the waitlist. The requester has been notified.", style: "bg-violet-50 text-violet-800" },
  cancel: { text: "Cancelled. The next person on the waitlist (if any) was promoted.", style: "bg-slate-100 text-slate-700" },
};

export function ReviewCard({ item, index }: { item: ReviewItem; index: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [outcome, setOutcome] = useState<Action>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const slotTaken = item.conflicts.some((c) => c.holdsSlot);
  const e = item.eligibility;

  async function decide(action: Action, why?: string) {
    setError(undefined);
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${item.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: why }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save your decision");
        return;
      }
      setOutcome(action);
      // Let the confirmation show for a moment before the card leaves the queue.
      timer.current = setTimeout(() => router.refresh(), 1100);
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  return (
    <li
      className="animate-fade-up overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:shadow-md"
      style={{ "--i": Math.min(index, 10) } as React.CSSProperties}
    >
      {outcome ? (
        <div className={`animate-pop-in p-6 text-sm font-medium ${OUTCOMES[outcome].style}`}>
          {OUTCOMES[outcome].text}
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/bookings/${item.id}`} className="font-semibold hover:text-indigo-700">
                  {item.resource.name}
                </Link>
                <BookingStatusBadge status={item.status} />
                {item.position && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                    Waitlist #{item.position}
                  </span>
                )}
                {item.needsManager && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Needs manager
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">{formatWindow(item.startsAt, item.endsAt)}</p>
            </div>
          </div>

          <div className="text-sm">
            <p>
              <span className="font-medium">{item.requester.name}</span>{" "}
              <span className="text-slate-500">· {item.requester.department}</span>
            </p>
            <p className="mt-1 whitespace-pre-line text-slate-700">{item.purpose}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {e.eligible ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                ✓ Meets every access condition
              </span>
            ) : (
              e.reasons.map((r) => (
                <span key={r} className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                  {r}
                </span>
              ))
            )}
          </div>

          {item.conflicts.length > 0 && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                slotTaken ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"
              }`}
            >
              <p className={`font-medium ${slotTaken ? "text-rose-900" : "text-amber-900"}`}>
                {slotTaken ? "This slot is already booked" : "Competing requests for this slot"}
              </p>
              <ul className="mt-2 space-y-1">
                {item.conflicts.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-slate-700">
                    <span>
                      {c.requesterName}{" "}
                      <span className="text-slate-500">· {formatWindow(c.startsAt, c.endsAt)}</span>
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      {BOOKING_STATUS_LABELS[c.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.started && item.status !== "APPROVED" && (
            <p className="text-sm text-amber-800">This request&apos;s start time has already passed.</p>
          )}

          {!item.canDecide ? (
            <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
              This resource needs manager approval, so a manager will decide on this request.
            </p>
          ) : mode ? (
            <div className="animate-fade-up space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                {mode === "reject" ? "Why are you rejecting this request?" : "Why are you cancelling this booking?"}
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  rows={2}
                  value={reason}
                  onChange={(ev) => setReason(ev.target.value)}
                  placeholder="The requester will see this reason"
                  autoFocus
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={pending || reason.trim().length < 5}
                  onClick={() => decide(mode, reason.trim())}
                  className={mode === "reject" ? "!bg-rose-600 hover:!bg-rose-700" : ""}
                >
                  {pending ? "Saving…" : mode === "reject" ? "Confirm rejection" : "Confirm cancellation"}
                </Button>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => { setMode(null); setReason(""); setError(undefined); }}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {item.status === "APPROVED" ? (
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setMode("cancel")}>
                  Cancel booking
                </Button>
              ) : (
                <>
                  <Button type="button" disabled={pending || slotTaken || item.started} onClick={() => decide("approve")}>
                    {pending ? "Saving…" : "Approve"}
                  </Button>
                  {item.status === "PENDING" && slotTaken && (
                    <Button type="button" variant="ghost" disabled={pending} onClick={() => decide("waitlist")} className="!bg-violet-50 !text-violet-800 hover:!bg-violet-100">
                      Waitlist
                    </Button>
                  )}
                  <Button type="button" variant="ghost" disabled={pending} onClick={() => setMode("reject")} className="!text-rose-700 hover:!bg-rose-50">
                    Reject
                  </Button>
                </>
              )}
            </div>
          )}

          {item.decisionReason && item.status !== "PENDING" && (
            <p className="text-xs text-slate-500">{item.decisionReason}</p>
          )}
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </li>
  );
}
