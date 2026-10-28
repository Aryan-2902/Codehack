"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { CATEGORY_LABELS } from "@/lib/format";
import type { ResourceSearch } from "@/lib/availability";

type Values = {
  q: string;
  category: string;
  location: string;
  date: string;
  from: string;
  to: string;
  eligible: boolean;
};

const EMPTY: Values = {
  q: "",
  category: "",
  location: "",
  date: "",
  from: "",
  to: "",
  eligible: false,
};

function toQuery(v: Values) {
  const params = new URLSearchParams();
  if (v.q.trim()) params.set("q", v.q.trim());
  if (v.category) params.set("category", v.category);
  if (v.location.trim()) params.set("location", v.location.trim());
  if (v.date) {
    params.set("date", v.date);
    if (v.from && v.to) {
      params.set("from", v.from);
      params.set("to", v.to);
    }
  }
  if (v.eligible) params.set("eligible", "1");
  return params.toString();
}

export function SearchFilters({ initial }: { initial: ResourceSearch }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState<Values>({
    q: initial.q ?? "",
    category: initial.category ?? "",
    location: initial.location ?? "",
    date: initial.date ?? "",
    from: initial.from ?? "",
    to: initial.to ?? "",
    eligible: initial.eligible === "1",
  });
  const first = useRef(true);

  // Push the filters into the URL (debounced) so the server re-runs the search
  // and the results stay shareable and survive a refresh.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const qs = toQuery(v);
      startTransition(() => {
        router.replace(qs ? `/resources?${qs}` : "/resources", { scroll: false });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [v, router]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setV((prev) => {
      const next = { ...prev, [key]: value };
      // Times only apply to a chosen date.
      if (key === "date" && !value) {
        next.from = "";
        next.to = "";
      }
      return next;
    });
  }

  const active = toQuery(v) !== "";

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-0.5 overflow-hidden transition-opacity ${
          pending ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="progress-bar h-full w-1/4 bg-indigo-500" />
      </div>

      <div className="relative">
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" />
        </svg>
        <Input
          type="search"
          aria-label="Search resources"
          placeholder="Search by name, description, category or location"
          value={v.q}
          onChange={(e) => set("q", e.target.value)}
          style={{ paddingLeft: "2.25rem" }}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Category">
          <Select value={v.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Input
            placeholder="e.g. Block C"
            value={v.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </Field>
        <Field label="Available on">
          <Input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="From">
            <Input
              type="time"
              value={v.from}
              disabled={!v.date}
              onChange={(e) => set("from", e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="time"
              value={v.to}
              disabled={!v.date}
              onChange={(e) => set("to", e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.eligible}
            onChange={(e) => set("eligible", e.target.checked)}
          />
          Only show resources I&apos;m eligible to book
        </label>
        {active && (
          <Button type="button" variant="ghost" onClick={() => setV(EMPTY)} className="animate-pop-in">
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
