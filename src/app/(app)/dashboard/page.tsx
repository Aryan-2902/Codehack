import { requireUser } from "@/lib/auth";
import { Card, RoleBadge } from "@/components/ui";
import { VerificationBadges } from "@/components/verification-badges";

export const metadata = { title: "Dashboard · Campus Lab Share" };

const roleBlurb = {
  STUDENT: "Browse equipment and spaces, request bookings, and track your history.",
  OWNER: "List your lab equipment, review requests, and verify the people who use it.",
  MANAGER: "Review requests that need extra approval and resolve incidents.",
  ADMIN: "Oversee the whole platform: assign roles and review all activity.",
} as const;

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-slate-600">{roleBlurb[user.role]}</p>
      </div>
      <Card>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="mt-1">
              <RoleBadge role={user.role} />
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Department</dt>
            <dd className="mt-1 font-medium">{user.department}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="mt-1 font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Verification</dt>
            <dd className="mt-1">
              <VerificationBadges
                verified={user.verified}
                safetyTrained={user.safetyTrained}
              />
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
