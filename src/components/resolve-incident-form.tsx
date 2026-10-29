"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText } from "@/components/ui";

const SUSPENSIONS = [
  [0, "No penalty"],
  [3, "Suspend booking for 3 days"],
  [7, "Suspend booking for 7 days"],
  [14, "Suspend booking for 14 days"],
  [30, "Suspend booking for 30 days"],
] as const;

// Managers and admins record the outcome. A penalty is always an explicit human choice.
export function ResolveIncidentForm({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [days, setDays] = useState(0);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, suspensionDays: days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not resolve the incident");
        return;
      }
      setDone(true);
      setTimeout(() => router.refresh(), 900);
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="animate-pop-in rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
        Resolved ✓ Both parties have been notified.
      </p>
    );
  }
  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Review &amp; resolve
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="animate-fade-up space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <label className="block text-sm font-medium text-slate-700">
        Resolution notes
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          rows={3}
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="What was decided and why? Both parties will see this."
          required
          minLength={10}
          maxLength={1000}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Penalty (optional)
        <select
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {SUSPENSIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {days > 0 && (
        <p className="animate-fade-in text-xs text-amber-800">
          The borrower won&apos;t be able to request new bookings for {days} days. They will be told why.
        </p>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Resolve incident"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
