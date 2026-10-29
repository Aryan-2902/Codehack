"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText } from "@/components/ui";
import { PhotoUpload } from "@/components/photo-upload";
import { CONDITION_LABELS, formatLate, type ConditionRating } from "@/lib/checkin-rules";

const RATINGS = Object.keys(CONDITION_LABELS) as ConditionRating[];
const RATING_STYLES: Record<ConditionRating, string> = {
  GOOD: "border-emerald-300 bg-emerald-50 text-emerald-900",
  MINOR_ISSUES: "border-amber-300 bg-amber-50 text-amber-900",
  DAMAGED: "border-rose-300 bg-rose-50 text-rose-900",
};

type Result = { lateMinutes: number; conditionChange: string; suggestIncident: boolean };

// Check-in (pick-up) and check-out (return) share one form: condition, notes and photos.
export function ConditionPanel({
  bookingId,
  mode,
}: {
  bookingId: string;
  mode: "check-in" | "check-out";
}) {
  const router = useRouter();
  const out = mode === "check-out";
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState<ConditionRating>("GOOD");
  const [notes, setNotes] = useState("");
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition, notes, photoIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save the report");
        return;
      }
      if (out) {
        // Show how the return went before the page refreshes into its "completed" state.
        setResult({
          lateMinutes: data.lateMinutes,
          conditionChange: data.conditionChange,
          suggestIncident: data.suggestIncident,
        });
        setOpen(false);
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <div className="animate-pop-in space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-900">Checked out ✓ The booking is complete.</p>
        {result.lateMinutes > 0 && (
          <p className="text-sm text-amber-800">Returned {formatLate(result.lateMinutes)} after the booked end time.</p>
        )}
        {result.conditionChange === "worse" && (
          <p className="text-sm text-rose-800">The condition is worse than at pick-up.</p>
        )}
        {result.suggestIncident && (
          <p className="text-sm text-slate-700">
            You can report this as an incident below. A manager will review it; nobody is penalised automatically.
          </p>
        )}
        <Button type="button" onClick={() => router.refresh()}>
          Continue
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} className="animate-pop-in">
        {out ? "Check out (return)" : "Check in (pick up)"}
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="animate-fade-up space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="font-semibold">
        {out ? "Return: record the condition" : "Pick-up: record the condition"}
      </h2>
      <p className="text-sm text-slate-600">
        {out
          ? "Describe the condition now and attach photos so it can be compared with pick-up."
          : "Describe the condition before use and attach photos. This is the reference for the return."}
      </p>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Condition</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {RATINGS.map((r) => (
            <label
              key={r}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition ${
                condition === r ? RATING_STYLES[r] + " ring-2 ring-offset-1 ring-indigo-300" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="condition"
                className="sr-only"
                checked={condition === r}
                onChange={() => setCondition(r)}
              />
              {CONDITION_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={out ? "e.g. Cleaned and returned; small scratch on the lid" : "e.g. Clean, all accessories present"}
          required
          minLength={3}
          maxLength={1000}
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Photos (at least one)</p>
        <PhotoUpload value={photoIds} onChange={setPhotoIds} disabled={pending} />
      </div>

      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || photoIds.length === 0}>
          {pending ? "Saving…" : out ? "Confirm return" : "Confirm pick-up"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
