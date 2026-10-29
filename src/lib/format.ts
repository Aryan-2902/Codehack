export const CATEGORY_LABELS: Record<string, string> = {
  WORKSHOP_TOOL: "Workshop tool",
  LAB_INSTRUMENT: "Lab instrument",
  BOOKABLE_SPACE: "Bookable space",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Under maintenance",
  RETIRED: "Retired",
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** 570 -> "09:30" */
export function minuteToTime(minute: number) {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "09:30" -> 570 */
export function timeToMinute(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Slot times are campus-local clock times (IST, UTC+05:30); instants are stored in UTC.
export const CAMPUS_UTC_OFFSET_MINUTES = 330;

/** A campus-local date ("YYYY-MM-DD") + minutes from midnight -> a UTC instant. */
export function localToInstant(date: string, minute: number) {
  return new Date(
    Date.parse(`${date}T00:00:00.000Z`) + minute * 60_000 - CAMPUS_UTC_OFFSET_MINUTES * 60_000,
  );
}

/** A UTC instant -> campus-local date + minutes from midnight. */
export function instantToLocal(instant: Date | string) {
  const shifted = new Date(new Date(instant).getTime() + CAMPUS_UTC_OFFSET_MINUTES * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minute: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function formatLocalDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Mon, 2 Nov 2026 · 10:00 – 12:00", or both ends when it spans days. */
export function formatWindow(startsAt: Date | string, endsAt: Date | string) {
  const s = instantToLocal(startsAt);
  const e = instantToLocal(endsAt);
  if (s.date === e.date) {
    return `${formatLocalDate(s.date)} · ${minuteToTime(s.minute)} – ${minuteToTime(e.minute)}`;
  }
  return `${formatLocalDate(s.date)} ${minuteToTime(s.minute)} → ${formatLocalDate(e.date)} ${minuteToTime(e.minute)}`;
}

/** A UTC instant as campus-local "Mon, 2 Nov 2026, 10:30". */
export function formatInstant(instant: Date | string) {
  const l = instantToLocal(instant);
  return `${formatLocalDate(l.date)}, ${minuteToTime(l.minute)}`;
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Awaiting review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WAITLISTED: "Waitlisted",
  CANCELLED: "Cancelled",
  CHECKED_IN: "In use",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};

export const BOOKING_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  WAITLISTED: "bg-violet-100 text-violet-800",
  CANCELLED: "bg-slate-100 text-slate-500",
  CHECKED_IN: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-indigo-100 text-indigo-800",
  NO_SHOW: "bg-orange-100 text-orange-800",
};

/** A campus-local date + minute range -> the UTC instants it covers. */
export function windowToInstants(date: string, startMinute: number, endMinute: number) {
  const midnightUtc = Date.parse(`${date}T00:00:00.000Z`);
  const shift = CAMPUS_UTC_OFFSET_MINUTES * 60_000;
  return {
    startsAt: new Date(midnightUtc + startMinute * 60_000 - shift),
    endsAt: new Date(midnightUtc + endMinute * 60_000 - shift),
  };
}

/** Date column -> "YYYY-MM-DD" (stored at UTC midnight). */
export function toDateInput(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a date. */
export function timeAgo(date: Date | string, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - new Date(date).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} d ago` : formatDate(date);
}

/** Dot colour for each kind of notification in the feed. */
export const NOTIFICATION_KIND_STYLES: Record<string, string> = {
  request: "bg-indigo-500",
  approved: "bg-emerald-500",
  rejected: "bg-rose-500",
  waitlisted: "bg-violet-500",
  promoted: "bg-emerald-500",
  cancelled: "bg-slate-400",
  checkin: "bg-sky-500",
  checkout: "bg-sky-500",
  overdue: "bg-rose-500",
  noshow: "bg-orange-500",
  reminder: "bg-amber-500",
  incident: "bg-orange-500",
  info: "bg-slate-400",
};
