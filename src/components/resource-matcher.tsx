"use client";

import Link from "next/link";
import { useState } from "react";
import { AiBadge, Sparkle } from "@/components/ai-badge";
import { Button, ErrorText } from "@/components/ui";
import { CATEGORY_LABELS } from "@/lib/format";

type Suggestion = {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  reason: string;
  eligibility: { eligible: boolean; reasons: string[] };
};
type Result = { mode: "ai" | "basic"; note?: string; suggestions: Suggestion[] };

const EXAMPLES = [
  "I need to print an enclosure for my IoT project",
  "We want a quiet room for a team sprint",
  "I have to debug a noisy signal on my circuit",
];

// "Describe what you need" -> a short list of resources worth a look. Suggestions only: nothing
// is booked here, and each one links to the normal listing and booking flow.
export function ResourceMatcher() {
  const [need, setNeed] = useState("");
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ need }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not get suggestions");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="animate-fade-up overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/60 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkle className="animate-bob h-5 w-5 text-violet-600" />
        <h2 className="font-semibold">Not sure what you need?</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Describe your project in a sentence and we&apos;ll suggest what to look at.
      </p>

      <form onSubmit={ask} className="mt-3 space-y-3">
        <textarea
          aria-label="Describe what you need"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          rows={2}
          maxLength={500}
          minLength={10}
          required
          placeholder="e.g. I need to print an enclosure for my IoT project"
          value={need}
          onChange={(e) => setNeed(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending || need.trim().length < 10}>
            {pending ? "Thinking…" : "Suggest resources"}
          </Button>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setNeed(ex)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:-translate-y-px hover:border-indigo-300 hover:text-indigo-700"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>
      <div className="mt-3">
        <ErrorText>{error}</ErrorText>
      </div>

      {pending && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      )}

      {result && !pending && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <AiBadge mode={result.mode} />
            {result.note && <span className="text-xs text-amber-800">{result.note}</span>}
          </div>

          {result.suggestions.length === 0 ? (
            <p className="animate-pop-in rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600">
              Nothing in the catalog is a clear fit. Try describing the task differently, or browse the
              resources below.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.suggestions.map((s, i) => (
                <li
                  key={s.id}
                  className="animate-fade-up"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <Link
                    href={`/resources/${s.id}`}
                    className="block h-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{s.name}</h3>
                      <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                        Suggestion
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {CATEGORY_LABELS[s.category] ?? s.category} · {s.location}
                    </p>
                    <p className="mt-2 text-sm italic text-slate-700">{s.reason}</p>
                    <p className="mt-3">
                      {s.eligibility.eligible ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          ✓ You&apos;re eligible
                        </span>
                      ) : (
                        <span
                          title={s.eligibility.reasons.join("\n")}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                        >
                          Requirements not met
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500">
            Suggestions only. Nothing is booked for you; open a resource to check availability and request it.
          </p>
        </div>
      )}
    </section>
  );
}
