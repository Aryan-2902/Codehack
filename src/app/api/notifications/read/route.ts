import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";

const schema = z.object({ ids: z.array(z.string()).max(200).optional() });

// Mark some (ids) or all of the user's own notifications as read.
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  const { ids } = await parseBody(req, schema);
  const result = await db.notification.updateMany({
    where: { userId: user.id, read: false, ...(ids ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
  return NextResponse.json({ updated: result.count });
});
