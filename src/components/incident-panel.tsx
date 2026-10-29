"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText } from "@/components/ui";
import { PhotoUpload } from "@/components/photo-upload";

const TYPES = [
  ["DAMAGE", "Damage", "Something was broken or damaged"],
  ["DELAY", "Delay", "Late pick-up or return"],
  ["CONFLICT", "Scheduling conflict", "A clash over the slot or access"],
] as const;

// Either party can report a problem. It goes to a manager for review; filing never penalises anyone.
export function IncidentPanel({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number][0]>("DAMAGE");
  const [description, setDescription] = useState("");
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description, photoIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not file the incident");
        return;
      }
      setOpen(false);
      setDescription("");
      setPhotoIds([]);
      router.refresh();
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)} className="!text-orange-700 hover:!bg-orange-50">
        Report an incident
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="animate-fade-up space-y-4 rounded-xl border border-orange-200 bg-orange-50/50 p-5"
    >
      <h3 className="font-semibold">Report an incident</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        {TYPES.map(([value, label, hint]) => (
          <label
            key={value}
            className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
              type === value
                ? "border-orange-400 bg-white ring-2 ring-orange-200"
                : "border-slate-200 bg-white/60 hover:bg-white"
            }`}
          >
            <input type="radio" name="type" className="sr-only" checked={type === value} onChange={() => setType(value)} />
            <span className="block font-medium">{label}</span>
            <span className="text-xs text-slate-500">{hint}</span>
          </label>
        ))}
      </div>
      <label className="block text-sm font-medium text-slate-700">
        What happened?
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          maxLength={1000}
        />
      </label>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Photos (optional)</p>
        <PhotoUpload value={photoIds} onChange={setPhotoIds} disabled={pending} />
      </div>
      <p className="text-xs text-slate-500">
        A manager reviews every incident. Nothing happens to anyone automatically.
      </p>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit incident"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
