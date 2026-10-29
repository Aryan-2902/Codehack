"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { NOTIFICATION_KIND_STYLES, timeAgo } from "@/lib/format";

type Item = {
  id: string;
  message: string;
  link: string | null;
  kind: string;
  read: boolean;
  createdAt: string;
};

// The full notification history. Opening an item marks it read and goes to what it's about.
export function NotificationList({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const unread = items.filter((n) => !n.read).length;

  async function markRead(ids?: string[]) {
    setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    }).catch(() => {});
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="animate-pop-in rounded-xl border border-dashed border-slate-300 p-10 text-center">
        <p className="font-medium text-slate-700">You&apos;re all caught up.</p>
        <p className="mt-1 text-sm text-slate-500">
          Approvals, waitlist updates, reminders and incidents will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{unread} unread</p>
        {unread > 0 && (
          <Button type="button" variant="ghost" onClick={() => markRead()}>
            Mark all as read
          </Button>
        )}
      </div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {items.map((n, i) => (
          <li key={n.id} className="animate-fade-up" style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
            <button
              type="button"
              onClick={() => {
                if (!n.read) markRead([n.id]);
                if (n.link) router.push(n.link);
              }}
              className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${
                n.read ? "" : "bg-indigo-50/60"
              }`}
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${NOTIFICATION_KIND_STYLES[n.kind] ?? NOTIFICATION_KIND_STYLES.info} ${
                  n.read ? "opacity-40" : ""
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${n.read ? "text-slate-600" : "font-medium text-slate-900"}`}>
                  {n.message}
                </span>
                <span className="text-xs text-slate-500">{timeAgo(n.createdAt)}</span>
              </span>
              {n.link && <span className="text-slate-400">→</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
