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
