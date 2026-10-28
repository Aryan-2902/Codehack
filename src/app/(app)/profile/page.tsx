import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { VerificationBadges } from "@/components/verification-badges";

export const metadata = { title: "Profile · Campus Lab Share" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <Card>
        <ProfileForm name={user.name} department={user.department} email={user.email} />
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">Verification</h2>
        <p className="mb-3 text-sm text-slate-600">
          These flags are set by a lab owner or manager after they check your ID or
          training. Some equipment requires them before you can book.
        </p>
        <VerificationBadges verified={user.verified} safetyTrained={user.safetyTrained} />
      </Card>
    </div>
  );
}
