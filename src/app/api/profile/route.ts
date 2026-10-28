import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { publicUserSelect, requireApiUser } from "@/lib/auth";
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
  return NextResponse.json({ user });
});
