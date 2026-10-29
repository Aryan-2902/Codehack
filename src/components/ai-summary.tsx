"use client";

import { useState } from "react";
import { AiBadge } from "@/components/ai-badge";
import { Button, ErrorText } from "@/components/ui";

type Summary = {
  mode: "ai" | "basic";
  note?: string;
  summary: string;
  keyFacts: string[];
  questions: string[];
};

// A neutral summary to read before deciding. It never fills in the resolution or the penalty:
// the manager still writes the outcome and clicks the button.
export function AiSummary({ incidentId }: { incidentId: string }) {
  const [data, setData] = useState<Summary>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function load() {
    setError(undefined);
    setPending(true);
    try {
      const res = await fetch("/api/ai/incident-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not summarise this incident");
        return;
      }
      setData(json);
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  if (!data) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="ghost" onClick={load} disabled={pending} className="!bg-violet-50 !text-violet-800 hover:!bg-violet-100">
          {pending ? "Summarising…" : "Summarise (suggestion)"}
        </Button>
        {pending && <div className="skeleton h-16 w-full" aria-busy="true" />}
        <ErrorText>{error}</ErrorText>
      </div>
    );
  }

  return (
    <div className="animate-pop-in space-y-3 rounded-lg border border-violet-200 bg-violet-50/60 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AiBadge mode={data.mode} />
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="text-xs font-medium text-violet-700 hover:underline disabled:opacity-50"
        >
          {pending ? "Refreshing…" : "Regenerate"}
        </button>
      </div>
      {data.note && <p className="text-xs text-amber-800">{data.note}</p>}
      <p className="text-slate-800">{data.summary}</p>
      {data.keyFacts.length > 0 && (
        <div>
          <p className="font-medium text-slate-700">Key facts</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
            {data.keyFacts.map((f, i) => (
              <li key={i} className="animate-fade-up" style={{ "--i": i } as React.CSSProperties}>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.questions.length > 0 && (
        <div>
          <p className="font-medium text-slate-700">Worth checking</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
            {data.questions.map((q, i) => (
              <li key={i} className="animate-fade-up" style={{ "--i": i + 3 } as React.CSSProperties}>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Advisory only. You review the evidence and decide the outcome; nothing is resolved or penalised automatically.
      </p>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
