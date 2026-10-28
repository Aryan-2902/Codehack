"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

// Resume/discard for drafts, withdraw for requests still waiting on a decision.
export function BookingActions({
  id,
  resourceId,
  status,
}: {
  id: string;
  resourceId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function run(url: string, method: string, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setError(undefined);
    setPending(true);
    try {
      const res = await fetch(url, { method });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  if (status === "DRAFT") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <Link
            href={`/resources/${resourceId}/book?draft=${id}`}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:-translate-y-px hover:bg-indigo-700 active:scale-95"
          >
            Resume
          </Link>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => run(`/api/bookings/${id}`, "DELETE", "Discard this draft?")}
          >
            Discard
          </Button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  if (status === "PENDING" || status === "WAITLISTED" || status === "APPROVED") {
    const approved = status === "APPROVED";
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() =>
            run(
              `/api/bookings/${id}/cancel`,
              "POST",
              approved
                ? "Cancel this approved booking? The next person on the waitlist will get the slot."
                : "Withdraw this request?",
            )
          }
        >
          {pending ? "Cancelling…" : approved ? "Cancel booking" : "Cancel request"}
        </Button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  return null;
}
