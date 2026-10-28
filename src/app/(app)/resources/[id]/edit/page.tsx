import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEditResource, resourceInclude } from "@/lib/resources";
import { minuteToTime, toDateInput } from "@/lib/format";
import { ResourceForm, type ResourceFormValues } from "@/components/resource-form";

export const metadata = { title: "Edit listing · Campus Lab Share" };

export default async function EditResourcePage({ params }: PageProps<"/resources/[id]/edit">) {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const { id } = await params;
  const r = await db.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!r) notFound();
  if (!canEditResource(user, r)) redirect(`/resources/${id}`);

  const initial: ResourceFormValues = {
    name: r.name,
    category: r.category,
    description: r.description,
    location: r.location,
    photos: r.photos,
    conditionAtListing: r.conditionAtListing ?? "",
    status: r.status,
    allowedRoles: r.allowedRoles,
    allowedDepartments: r.allowedDepartments,
    requiresVerified: r.requiresVerified,
    requiresSafetyTraining: r.requiresSafetyTraining,
    requiresEligibilityGrant: r.requiresEligibilityGrant,
    requiresSupervision: r.requiresSupervision,
    depositRequired: r.depositRequired,
    depositAmount: r.depositAmount?.toString() ?? "",
    maxBookingHours: String(r.maxBookingHours),
    maxConcurrentBookings: String(r.maxConcurrentBookings),
    expectedReturnCondition: r.expectedReturnCondition,
    slots: r.slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      start: minuteToTime(s.startMinute),
      end: minuteToTime(s.endMinute),
    })),
    blackouts: r.blackouts.map((b) => ({ date: toDateInput(b.date), reason: b.reason ?? "" })),
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Edit listing</h1>
      <ResourceForm resourceId={r.id} initial={initial} />
    </div>
  );
}
