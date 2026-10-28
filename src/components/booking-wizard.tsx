"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { EvaluationChecklist } from "@/components/evaluation-checklist";
import type { Evaluation } from "@/lib/booking-rules";
import { DAY_NAMES, formatLocalDate, formatDate } from "@/lib/format";
import { MIN_PURPOSE_LENGTH } from "@/lib/validation";

export type BookingValues = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  purpose: string;
};

export type WizardResource = {
  id: string;
  name: string;
  maxBookingHours: number;
  maxConcurrentBookings: number;
  slots: { dayOfWeek: number; start: string; end: string }[];
  blackouts: { date: string; reason: string | null }[];
};

const STEPS = ["Details", "Review", "Done"];

function hoursBetween(v: BookingValues) {
  if (!v.startDate || !v.startTime || !v.endDate || !v.endTime) return null;
  const start = Date.parse(`${v.startDate}T${v.startTime}:00Z`);
  const end = Date.parse(`${v.endDate}T${v.endTime}:00Z`);
  return end > start ? (end - start) / 3_600_000 : null;
}

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="relative flex items-center justify-between">
      <div aria-hidden className="absolute inset-x-4 top-4 h-0.5 bg-slate-200">
        <div
          className="h-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
      {STEPS.map((label, i) => (
        <li key={label} className="relative z-10 flex flex-col items-center gap-1">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
              i < step
                ? "bg-indigo-500 text-white"
                : i === step
                  ? "scale-110 bg-indigo-600 text-white ring-4 ring-indigo-100"
                  : "bg-slate-200 text-slate-500"
            }`}
          >
            {i < step ? "✓" : i + 1}
          </span>
          <span className={`text-xs ${i <= step ? "font-medium text-slate-900" : "text-slate-500"}`}>
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function BookingWizard({
  resource,
  today,
  draft,
}: {
  resource: WizardResource;
  today: string;
  draft?: { id: string; values: BookingValues };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState(draft?.id);
  const [v, setV] = useState<BookingValues>(
    draft?.values ?? { startDate: "", startTime: "", endDate: "", endTime: "", purpose: "" },
  );
  const [evaluation, setEvaluation] = useState<Evaluation>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  function set<K extends keyof BookingValues>(key: K, value: BookingValues[K]) {
    setV((prev) => {
      const next = { ...prev, [key]: value };
      // Most bookings are same-day, so the end date follows the start date until changed.
      if (key === "startDate" && (!prev.endDate || prev.endDate < (value as string))) {
        next.endDate = value as string;
      }
      return next;
    });
  }

  async function request(url: string, method: string, body?: object) {
    setError(undefined);
    setPending(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } catch {
      setError("Network error, please try again");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    const result = await request(
      draftId ? `/api/bookings/${draftId}` : "/api/bookings",
      draftId ? "PATCH" : "POST",
      draftId ? v : { ...v, resourceId: resource.id },
    );
    if (!result) return;
    if (!result.res.ok) {
      setError(result.data.error ?? "Could not save your request");
      return;
    }
    setDraftId(result.data.booking.id);
    setEvaluation(result.data.evaluation);
    setStep(1);
  }

  async function submit() {
    if (!draftId) return;
    const result = await request(`/api/bookings/${draftId}/submit`, "POST");
    if (!result) return;
    if (!result.res.ok) {
      // The server re-checks everything; if it disagrees, show its result.
      if (result.data.evaluation) setEvaluation(result.data.evaluation);
      setError(result.data.error ?? "Could not submit your request");
      return;
    }
    setStep(2);
  }

  async function discard() {
    if (!draftId || !window.confirm("Discard this draft?")) return;
    const result = await request(`/api/bookings/${draftId}`, "DELETE");
    if (result?.res.ok) {
      router.push(`/resources/${resource.id}`);
      router.refresh();
    } else if (result) {
      setError(result.data.error ?? "Could not discard the draft");
    }
  }

  const hours = hoursBetween(v);
  const overMax = hours !== null && hours > resource.maxBookingHours;

  return (
    <div className="space-y-8">
      <StepIndicator step={step} />

      <div key={step} className="animate-fade-up">
        {step === 0 && (
          <form onSubmit={saveDraft} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start date">
                <Input
                  type="date"
                  min={today}
                  value={v.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  required
                />
              </Field>
              <Field label="Start time">
                <Input
                  type="time"
                  value={v.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                  required
                />
              </Field>
              <Field label="End date">
                <Input
                  type="date"
                  min={v.startDate || today}
                  value={v.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                  required
                />
              </Field>
              <Field label="End time">
                <Input
                  type="time"
                  value={v.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                  required
                />
              </Field>
            </div>

            {hours !== null && (
              <p
                className={`animate-pop-in text-sm ${overMax ? "text-rose-700" : "text-slate-600"}`}
              >
                Duration: {Number(hours.toFixed(1))} h
                {overMax && ` (maximum is ${resource.maxBookingHours} h)`}
              </p>
            )}

            <Field label="Purpose">
              <textarea
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                rows={4}
                minLength={MIN_PURPOSE_LENGTH}
                maxLength={500}
                placeholder="What will you use it for? (e.g. printing enclosure prototypes for the IoT course project)"
                value={v.purpose}
                onChange={(e) => set("purpose", e.target.value)}
                required
              />
            </Field>

            <ErrorText>{error}</ErrorText>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? "Checking…" : "Review request"}
              </Button>
              <p className="text-xs text-slate-500">
                We save a draft and check eligibility. Nothing is sent until you submit.
              </p>
            </div>
          </form>
        )}

        {step === 1 && evaluation && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">{resource.name}</h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">From</dt>
                  <dd className="font-medium">
                    {formatLocalDate(v.startDate)} · {v.startTime}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">To</dt>
                  <dd className="font-medium">
                    {formatLocalDate(v.endDate)} · {v.endTime}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Purpose</dt>
                  <dd className="whitespace-pre-line">{v.purpose}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="mb-2 font-semibold">Eligibility check</h2>
              <EvaluationChecklist checks={evaluation.checks} />
            </div>

            {evaluation.warnings.length > 0 && (
              <ul className="animate-fade-up space-y-1 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                {evaluation.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            )}

            {evaluation.ok ? (
              <p className="animate-pop-in rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                You meet every requirement. Submit to send this to the reviewer.
              </p>
            ) : (
              <p className="animate-pop-in rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                This request can&apos;t be submitted until the items above are resolved.
              </p>
            )}

            <ErrorText>{error}</ErrorText>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={submit} disabled={pending || !evaluation.ok}>
                {pending ? "Submitting…" : "Submit request"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep(0)} disabled={pending}>
                Edit details
              </Button>
              <Button type="button" variant="ghost" onClick={discard} disabled={pending}>
                Discard draft
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-6 text-center">
            <svg viewBox="0 0 52 52" className="mx-auto h-20 w-20 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="26" cy="26" r="23" className="animate-draw" />
              <path d="m15 27 8 8 14-16" className="animate-draw" style={{ animationDelay: "0.35s" }} />
            </svg>
            <h2 className="animate-fade-up text-xl font-bold" style={{ "--i": 3 } as React.CSSProperties}>
              Request submitted
            </h2>
            <p className="animate-fade-up text-slate-600" style={{ "--i": 4 } as React.CSSProperties}>
              The resource owner will review it. You can track it under My bookings.
            </p>
            <div className="animate-fade-up flex justify-center gap-3" style={{ "--i": 5 } as React.CSSProperties}>
              <Link
                href="/bookings"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-px hover:bg-indigo-700 active:scale-95"
              >
                View my bookings
              </Link>
              <Link
                href="/resources"
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Browse more
              </Link>
            </div>
          </div>
        )}
      </div>

      {step === 0 && (
        <aside className="animate-fade-up rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Good to know about {resource.name}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Max {resource.maxBookingHours} h per booking, {resource.maxConcurrentBookings} active request(s) at a time.</li>
            {resource.slots.length > 0 ? (
              <li>
                Open:{" "}
                {resource.slots
                  .map((s) => `${DAY_NAMES[s.dayOfWeek].slice(0, 3)} ${s.start}–${s.end}`)
                  .join(", ")}
              </li>
            ) : (
              <li>No open slots have been set yet.</li>
            )}
            {resource.blackouts.length > 0 && (
              <li>
                Closed:{" "}
                {resource.blackouts
                  .map((b) => `${formatDate(b.date)}${b.reason ? ` (${b.reason})` : ""}`)
                  .join(", ")}
              </li>
            )}
          </ul>
        </aside>
      )}
    </div>
  );
}
