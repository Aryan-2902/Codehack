import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicUserSelect } from "@/lib/auth";
import { PeopleTable } from "@/components/people-table";

export const metadata = { title: "People · Campus Lab Share" };

export default async function PeoplePage() {
  const me = await requireUser(["OWNER", "MANAGER", "ADMIN"]);
  const users = await db.user.findMany({
    select: publicUserSelect,
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">People</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mark people as ID verified or safety trained
          {me.role === "ADMIN" ? " and assign roles." : "."}
        </p>
      </div>
      <PeopleTable initialUsers={users} meId={me.id} isAdmin={me.role === "ADMIN"} />
    </div>
  );
}
