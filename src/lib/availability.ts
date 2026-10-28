// Pure search helpers (no DB, no server-only) so the rules can be unit-tested and reused
// by the browse page, the API and, later, the booking flow.
import { z } from "zod";
import { CATEGORIES } from "@/lib/validation";
import { CATEGORY_LABELS, timeToMinute } from "@/lib/format";

// An invalid or empty value just drops that one filter instead of failing the whole search.
const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)));

export const searchSchema = z.object({
  q: optional(z.string().trim().max(100)),
  category: optional(z.enum(CATEGORIES)),
  location: optional(z.string().trim().max(100)),
  date: optional(date),
  from: optional(time),
  to: optional(time),
  eligible: optional(z.literal("1")),
});

export type ResourceSearch = z.infer<typeof searchSchema>;

type RawParams = Record<string, string | string[] | undefined>;

/** Accepts Next's searchParams (or URLSearchParams entries) and returns a clean search. */
export function parseSearch(raw: RawParams): ResourceSearch {
  const flat = Object.fromEntries(
    Object.entries(raw)
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      .filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = searchSchema.parse(flat);
  // A time range only makes sense on a date, and only when it runs forwards.
  const validWindow =
    parsed.date &&
    parsed.from &&
    parsed.to &&
    timeToMinute(parsed.to) > timeToMinute(parsed.from);
  if (!validWindow) {
    delete parsed.from;
    delete parsed.to;
  }
  return parsed;
}

/** Categories whose label matches a search word, so "tool" finds "Workshop tool". */
export function matchingCategories(term: string) {
  const t = term.toLowerCase();
  return CATEGORIES.filter((c) => CATEGORY_LABELS[c].toLowerCase().includes(t));
}

export function searchTerms(q?: string) {
  return (q ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
}

type AvailabilityResource = {
  status: string;
  maxBookingHours: number;
  slots: { dayOfWeek: number; startMinute: number; endMinute: number }[];
  blackouts: { date: Date }[];
};

/**
 * Is the resource open on `date` (YYYY-MM-DD)? With a from/to window it must also be
 * covered by one weekly slot and fit within the max booking duration.
 */
export function isAvailable(
  r: AvailabilityResource,
  date: string,
  window?: { from: string; to: string },
) {
  if (r.status !== "ACTIVE") return false;
  if (r.blackouts.some((b) => b.date.toISOString().slice(0, 10) === date)) return false;

  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const daySlots = r.slots.filter((s) => s.dayOfWeek === day);
  if (daySlots.length === 0) return false;
  if (!window) return true;

  const from = timeToMinute(window.from);
  const to = timeToMinute(window.to);
  if (to - from > r.maxBookingHours * 60) return false;
  return daySlots.some((s) => s.startMinute <= from && s.endMinute >= to);
}
