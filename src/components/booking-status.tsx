import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from "@/lib/format";

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        BOOKING_STATUS_STYLES[status] ?? ""
      }`}
    >
      {BOOKING_STATUS_LABELS[status] ?? status}
    </span>
  );
}
