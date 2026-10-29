import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { publicUserSelect, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { profileSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const user = await requireApiUser();
  return NextResponse.json({ user });
});

export const PATCH = handle(async (req: Request) => {
  const me = await requireApiUser();
  const data = await parseBody(req, profileSchema);
  const user = await db.user.update({
    where: { id: me.id },
    data,
    select: publicUserSelect,
  });
  await audit({
    actorId: me.id,
    action: "user.profile_updated",
    targetType: "User",
    targetId: me.id,
    metadata: { nameChanged: me.name !== user.name, departmentChanged: me.department !== user.department },
  });
  return NextResponse.json({ user });
});
