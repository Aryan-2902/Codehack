import { requireUser } from "@/lib/auth";
import { ResourceForm } from "@/components/resource-form";

export const metadata = { title: "New listing · Campus Lab Share" };

export default async function NewResourcePage() {
  await requireUser(["OWNER", "ADMIN"]);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">New listing</h1>
      <ResourceForm />
    </div>
  );
}
