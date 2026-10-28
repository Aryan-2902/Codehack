import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { publicUserSelect, requireApiUser } from "@/lib/auth";

// Directory used by Owners/Managers/Admins to verify people and by Admins to assign roles.
export const GET = handle(async (req: Request) => {
  await requireApiUser(["OWNER", "MANAGER", "ADMIN"]);

  const q = new URL(req.url).searchParams.get("q")?.trim();
  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { department: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: publicUserSelect,
    orderBy: { name: "asc" },
    take: 100,
  });
  return NextResponse.json({ users });
});
