"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NOTIFICATION_KIND_STYLES, timeAgo } from "@/lib/format";

type Item = {
  id: string;
  message: string;
  link: string | null;
  kind: string;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 20_000;

// The in-app feed. It polls the server (no websockets), wiggles when something new arrives,
// and marks items read as they are opened.
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [rings, setRings] = useState(0);
  const previous = useRef(initialUnread);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications);
      setUnread(data.unread);
      setLoaded(true);
      if (data.unread > previous.current) setRings((n) => n + 1);
      previous.current = data.unread;
    } catch {
      // Offline or a blip: the next poll will catch up.
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function markRead(ids?: string[]) {
    // Optimistic: update the UI first, the server catches up.
    setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    const count = ids ? items.filter((n) => ids.includes(n.id) && !n.read).length : unread;
    setUnread((u) => Math.max(0, u - count));
    previous.current = Math.max(0, previous.current - count);
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    }).catch(() => {});
  }

  function openItem(n: Item) {
    if (!n.read) markRead([n.id]);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) refresh();
        }}
        className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <svg
          key={rings}
          viewBox="0 0 24 24"
          className={`h-5 w-5 ${rings > 0 ? "animate-ring" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span
            key={unread}
            className="animate-pop-in absolute -right-0.5 -top-0.5 flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-pop-in absolute right-0 z-20 mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead()}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <li className="space-y-2 p-4">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">You&apos;re all caught up.</li>
            ) : (
              items.slice(0, 10).map((n, i) => (
                <li key={n.id} className="animate-fade-in" style={{ "--i": i } as React.CSSProperties}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                      n.read ? "" : "bg-indigo-50/60"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${NOTIFICATION_KIND_STYLES[n.kind] ?? NOTIFICATION_KIND_STYLES.info} ${
                        n.read ? "opacity-40" : ""
                      }`}
                    />
                    <span className="min-w-0">
                      <span className={`block text-sm ${n.read ? "text-slate-600" : "font-medium text-slate-900"}`}>
                        {n.message}
                      </span>
                      <span className="text-xs text-slate-500">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-indigo-600 transition hover:bg-slate-50"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
