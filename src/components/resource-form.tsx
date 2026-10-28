"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText, Field, Input, Select } from "@/components/ui";
import {
  CATEGORY_LABELS,
  DAY_NAMES,
  STATUS_LABELS,
  timeToMinute,
} from "@/lib/format";
import { DEPARTMENTS } from "@/lib/validation";

export type ResourceFormValues = {
  name: string;
  category: string;
  description: string;
  location: string;
  photos: string[];
  conditionAtListing: string;
  status: string;
  allowedRoles: string[];
  allowedDepartments: string[];
  requiresVerified: boolean;
  requiresSafetyTraining: boolean;
  requiresEligibilityGrant: boolean;
  requiresSupervision: boolean;
  depositRequired: boolean;
  depositAmount: string;
  maxBookingHours: string;
  maxConcurrentBookings: string;
  expectedReturnCondition: string;
  slots: { dayOfWeek: number; start: string; end: string }[];
  blackouts: { date: string; reason: string }[];
};

export const emptyResource: ResourceFormValues = {
  name: "",
  category: "WORKSHOP_TOOL",
  description: "",
  location: "",
  photos: [],
  conditionAtListing: "",
  status: "ACTIVE",
  allowedRoles: ["STUDENT", "OWNER"],
  allowedDepartments: [],
  requiresVerified: false,
  requiresSafetyTraining: false,
  requiresEligibilityGrant: false,
  requiresSupervision: false,
  depositRequired: false,
  depositAmount: "",
  maxBookingHours: "4",
  maxConcurrentBookings: "1",
  expectedReturnCondition: "Clean and in the same condition as received",
  slots: [{ dayOfWeek: 1, start: "09:00", end: "17:00" }],
  blackouts: [],
};

const ROLE_OPTIONS = [
  ["STUDENT", "Students"],
  ["OWNER", "Lab owners"],
  ["MANAGER", "Managers"],
  ["ADMIN", "Admins"],
] as const;

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <legend className="px-1 text-base font-semibold">{title}</legend>
      {hint && <p className="-mt-2 text-sm text-slate-500">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function ResourceForm({
  resourceId,
  initial = emptyResource,
}: {
  resourceId?: string;
  initial?: ResourceFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editing = Boolean(resourceId);

  function set<K extends keyof ResourceFormValues>(key: K, value: ResourceFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadPhoto(file: File) {
    setError(undefined);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setV((prev) => ({ ...prev, photos: [...prev.photos, data.url] }));
    } catch {
      setError("Network error while uploading");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    const payload = {
      name: v.name,
      category: v.category,
      description: v.description,
      location: v.location,
      photos: v.photos,
      conditionAtListing: v.conditionAtListing || undefined,
      status: v.status,
      allowedRoles: v.allowedRoles,
      allowedDepartments: v.allowedDepartments,
      requiresVerified: v.requiresVerified,
      requiresSafetyTraining: v.requiresSafetyTraining,
      requiresEligibilityGrant: v.requiresEligibilityGrant,
      requiresSupervision: v.requiresSupervision,
      depositRequired: v.depositRequired,
      depositAmount: v.depositRequired && v.depositAmount ? Number(v.depositAmount) : undefined,
      maxBookingHours: Number(v.maxBookingHours),
      maxConcurrentBookings: Number(v.maxConcurrentBookings),
      expectedReturnCondition: v.expectedReturnCondition,
      slots: v.slots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startMinute: timeToMinute(s.start),
        endMinute: timeToMinute(s.end),
      })),
      blackouts: v.blackouts
        .filter((b) => b.date)
        .map((b) => ({ date: b.date, reason: b.reason || undefined })),
    };
    try {
      const res = await fetch(editing ? `/api/resources/${resourceId}` : "/api/resources", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the listing");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/resources/${data.resource.id}`);
      router.refresh();
    } catch {
      setError("Network error, please try again");
    } finally {
      setPending(false);
    }
  }

  const updateSlot = (i: number, patch: Partial<ResourceFormValues["slots"][number]>) =>
    set(
      "slots",
      v.slots.map((x, j) => (j === i ? { ...x, ...patch } : x)),
    );
  const updateBlackout = (i: number, patch: Partial<ResourceFormValues["blackouts"][number]>) =>
    set(
      "blackouts",
      v.blackouts.map((x, j) => (j === i ? { ...x, ...patch } : x)),
    );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <ErrorText>{error}</ErrorText>

      <Section title="Basics">
        <Field label="Name">
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={v.category} onChange={(e) => set("category", e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location">
            <Input
              value={v.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Block C, Room 204"
              required
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            rows={4}
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
            required
          />
        </Field>
        <Field label="Condition at listing">
          <Input
            value={v.conditionAtListing}
            onChange={(e) => set("conditionAtListing", e.target.value)}
            placeholder="e.g. Excellent, calibrated Sept 2026"
          />
        </Field>
        {editing && (
          <Field label="Status">
            <Select value={v.status} onChange={(e) => set("status", e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Section>

      <Section title="Photos" hint="Up to 6 images, 5 MB each.">
        <div className="flex flex-wrap gap-3">
          {v.photos.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-24 rounded-md object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() =>
                  set(
                    "photos",
                    v.photos.filter((p) => p !== url),
                  )
                }
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-slate-800 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {v.photos.length < 6 && (
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(file);
              e.target.value = "";
            }}
            className="text-sm"
          />
        )}
        {uploading && <p className="text-sm text-slate-500">Uploading…</p>}
      </Section>

      <Section title="Who can book" hint="Leave a group empty to allow everyone in it.">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Account types</p>
          <div className="flex flex-wrap gap-4">
            {ROLE_OPTIONS.map(([role, label]) => (
              <Checkbox
                key={role}
                label={label}
                checked={v.allowedRoles.includes(role)}
                onChange={() => set("allowedRoles", toggle(v.allowedRoles, role))}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Departments</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {DEPARTMENTS.map((d) => (
              <Checkbox
                key={d}
                label={d}
                checked={v.allowedDepartments.includes(d)}
                onChange={() => set("allowedDepartments", toggle(v.allowedDepartments, d))}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox
            label="ID verified"
            checked={v.requiresVerified}
            onChange={(c) => set("requiresVerified", c)}
          />
          <Checkbox
            label="Safety training completed"
            checked={v.requiresSafetyTraining}
            onChange={(c) => set("requiresSafetyTraining", c)}
          />
          <Checkbox
            label="Per-equipment approval (e.g. induction)"
            checked={v.requiresEligibilityGrant}
            onChange={(c) => set("requiresEligibilityGrant", c)}
          />
          <Checkbox
            label="Supervision required during use"
            checked={v.requiresSupervision}
            onChange={(c) => set("requiresSupervision", c)}
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Checkbox
            label="Deposit required"
            checked={v.depositRequired}
            onChange={(c) => set("depositRequired", c)}
          />
          {v.depositRequired && (
            <Field label="Deposit amount (INR)">
              <Input
                type="number"
                min={1}
                value={v.depositAmount}
                onChange={(e) => set("depositAmount", e.target.value)}
                required
              />
            </Field>
          )}
        </div>
      </Section>

      <Section title="Usage rules">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Max booking duration (hours)">
            <Input
              type="number"
              min={1}
              max={168}
              value={v.maxBookingHours}
              onChange={(e) => set("maxBookingHours", e.target.value)}
              required
            />
          </Field>
          <Field label="Max concurrent bookings per user">
            <Input
              type="number"
              min={1}
              max={50}
              value={v.maxConcurrentBookings}
              onChange={(e) => set("maxConcurrentBookings", e.target.value)}
              required
            />
          </Field>
        </div>
        <Field label="Expected return condition">
          <Input
            value={v.expectedReturnCondition}
            onChange={(e) => set("expectedReturnCondition", e.target.value)}
            required
          />
        </Field>
      </Section>

      <Section title="Availability" hint="Weekly open slots. Add blackout dates for closures.">
        <div className="space-y-2">
          {v.slots.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Day"
                className="w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={s.dayOfWeek}
                onChange={(e) => updateSlot(i, { dayOfWeek: Number(e.target.value) })}
              >
                {DAY_NAMES.map((d, idx) => (
                  <option key={d} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                aria-label="Opens"
                type="time"
                className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={s.start}
                onChange={(e) => updateSlot(i, { start: e.target.value })}
                required
              />
              <span className="text-slate-500">to</span>
              <input
                aria-label="Closes"
                type="time"
                className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={s.end}
                onChange={(e) => updateSlot(i, { end: e.target.value })}
                required
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  set(
                    "slots",
                    v.slots.filter((_, j) => j !== i),
                  )
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              set("slots", [...v.slots, { dayOfWeek: 1, start: "09:00", end: "17:00" }])
            }
          >
            + Add slot
          </Button>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Blackout dates</p>
          {v.blackouts.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Blackout date"
                type="date"
                className="w-44 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={b.date}
                onChange={(e) => updateBlackout(i, { date: e.target.value })}
                required
              />
              <input
                aria-label="Reason"
                className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Reason (optional)"
                value={b.reason}
                onChange={(e) => updateBlackout(i, { reason: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  set(
                    "blackouts",
                    v.blackouts.filter((_, j) => j !== i),
                  )
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => set("blackouts", [...v.blackouts, { date: "", reason: "" }])}
          >
            + Add blackout date
          </Button>
        </div>
      </Section>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create listing"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
