// Turns a raw audit entry (action + metadata) into a plain-English line. Pure, so every
// action the app writes can be checked to have a readable description.
import { CONDITION_LABELS, formatLate, type ConditionRating } from "@/lib/checkin-rules";

export type AuditTone = "good" | "bad" | "warn" | "info" | "neutral";
export type AuditView = { label: string; detail?: string; tone: AuditTone };
type Meta = Record<string, unknown> | null | undefined;

/** The names behind the rule keys an eligibility check can fail on. */
const RULE_NAMES: Record<string, string> = {
  status: "resource availability",
  owner: "own resource",
  role: "account type",
  department: "department",
  verified: "ID verification",
  safety: "safety training",
  grant: "equipment approval",
  standing: "account standing",
  order: "time range",
  future: "start time",
  blackout: "closed dates",
  hours: "opening hours",
  duration: "maximum length",
  limit: "per-resource limit",
  fair_active: "fair usage: overall limit",
  fair_week: "fair usage: weekly limit",
  fair_cooldown: "fair usage: cooldown",
};

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const joinDetail = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" · ") || undefined;

export function describeAudit(action: string, meta: Meta): AuditView {
  const m = meta ?? {};

  switch (action) {
    case "user.signed_up":
      return { label: "Account created", detail: str(m.role) && `as ${cap(str(m.role)!)}`, tone: "info" };
    case "user.profile_updated":
      return { label: "Profile updated", tone: "neutral" };
    case "user.logged_in":
      return { label: "Signed in", tone: "neutral" };
    case "user.login_failed":
      return { label: "Failed sign-in attempt", detail: m.knownAccount ? "wrong password" : "unknown email", tone: "warn" };
    case "user.login_throttled":
      return { label: "Sign-in blocked after repeated failures", tone: "bad" };
    case "user.verification_updated": {
      const parts = [
        typeof m.verified === "boolean" ? `ID verified: ${m.verified ? "yes" : "no"}` : undefined,
        typeof m.safetyTrained === "boolean" ? `Safety training: ${m.safetyTrained ? "yes" : "no"}` : undefined,
      ];
      return { label: "Verification updated", detail: joinDetail(...parts), tone: "info" };
    }
    case "user.role_changed":
      return { label: "Role changed", detail: `${cap(str(m.from) ?? "?")} → ${cap(str(m.to) ?? "?")}`, tone: "warn" };
    case "user.suspended":
      return { label: "Booking privileges suspended", detail: num(m.days) ? `${m.days} day${m.days === 1 ? "" : "s"}` : undefined, tone: "bad" };
    case "audit.exported":
      return { label: "Audit log exported", detail: str(m.filter), tone: "info" };
    case "eligibility.granted":
      return { label: "Equipment approval granted", detail: str(m.note), tone: "good" };
    case "eligibility.revoked":
      return { label: "Equipment approval revoked", tone: "warn" };
    case "resource.created":
      return { label: "Listing created", detail: str(m.name), tone: "info" };
    case "resource.updated":
      return { label: "Listing updated", detail: joinDetail(str(m.name), str(m.status) && cap(str(m.status)!)), tone: "info" };

    case "booking.eligibility_checked": {
      const failed = Array.isArray(m.failed) ? (m.failed as string[]) : [];
      return m.passed
        ? { label: "Eligibility check passed", tone: "good" }
        : {
            label: "Eligibility check failed",
            detail: failed.map((k) => RULE_NAMES[k] ?? k).join(", ") || undefined,
            tone: "bad",
          };
    }
    case "booking.submitted":
      return { label: "Request submitted", tone: "info" };
    case "booking.approved":
      return { label: "Approved", detail: str(m.reason), tone: "good" };
    case "booking.rejected":
      return { label: "Rejected", detail: str(m.reason), tone: "bad" };
    case "booking.waitlisted":
      return { label: "Waitlisted", detail: joinDetail(num(m.position) ? `#${m.position} in line` : undefined, str(m.rule)), tone: "warn" };
    case "booking.promoted":
      return { label: "Promoted from the waitlist", detail: str(m.rule), tone: "good" };
    case "booking.cancelled":
      return {
        label: "Cancelled",
        detail: joinDetail(
          m.by === "reviewer" ? "by a reviewer" : m.by === "requester" ? "by the requester" : undefined,
          str(m.reason),
          str(m.rule),
        ),
        tone: "neutral",
      };
    case "booking.checked_in":
      return { label: "Checked in", detail: str(m.condition) && CONDITION_LABELS[str(m.condition) as ConditionRating], tone: "info" };
    case "booking.checked_out": {
      const late = num(m.lateMinutes);
      return {
        label: "Checked out",
        detail: joinDetail(
          str(m.condition) && CONDITION_LABELS[str(m.condition) as ConditionRating],
          m.conditionChange === "worse" ? "worse than at pick-up" : undefined,
          late ? `${formatLate(late)} late` : undefined,
        ),
        tone: m.conditionChange === "worse" || (late ?? 0) > 0 ? "warn" : "good",
      };
    }
    case "booking.overdue_flagged":
      return { label: "Flagged overdue", detail: "not returned by the end of the booking", tone: "bad" };
    case "booking.no_show":
      return { label: "Marked as a no-show", detail: str(m.rule), tone: "bad" };
    case "incident.filed":
      return { label: "Incident filed", detail: str(m.type) && cap(str(m.type)!), tone: "warn" };
    case "incident.resolved":
      return {
        label: "Incident resolved",
        detail: num(m.suspensionDays) ? `suspension: ${m.suspensionDays} days` : "no penalty",
        tone: "good",
      };
    default:
      return { label: action.replace(/[._]/g, " "), tone: "neutral" };
  }
}

/** Every action the app writes. A test makes sure each has a real description. */
export const KNOWN_ACTIONS = [
  "user.signed_up",
  "user.logged_in",
  "user.profile_updated",
  "user.login_failed",
  "user.login_throttled",
  "user.verification_updated",
  "user.role_changed",
  "user.suspended",
  "audit.exported",
  "eligibility.granted",
  "eligibility.revoked",
  "resource.created",
  "resource.updated",
  "booking.eligibility_checked",
  "booking.submitted",
  "booking.approved",
  "booking.rejected",
  "booking.waitlisted",
  "booking.promoted",
  "booking.cancelled",
  "booking.checked_in",
  "booking.checked_out",
  "booking.overdue_flagged",
  "booking.no_show",
  "incident.filed",
  "incident.resolved",
] as const;

export const AUDIT_GROUPS = [
  ["all", "Everything", null],
  ["booking", "Bookings", ["booking."]],
  ["incident", "Incidents", ["incident."]],
  ["resource", "Listings & approvals", ["resource.", "eligibility."]],
  ["user", "Accounts & security", ["user.", "audit."]],
] as const;
