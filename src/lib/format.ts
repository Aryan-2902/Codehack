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
