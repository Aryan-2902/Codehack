import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, publicUserSelect, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { verificationSchema } from "@/lib/validation";

export const PATCH = handle(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const actor = await requireApiUser(["OWNER", "MANAGER", "ADMIN"]);
    const { id } = await params;
    const data = await parseBody(req, verificationSchema);

    const target = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw new ApiError(404, "User not found");

    const user = await db.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
    await audit({
      actorId: actor.id,
      action: "user.verification_updated",
      targetType: "User",
      targetId: id,
      metadata: data,
    });
    return NextResponse.json({ user });
  },
);
