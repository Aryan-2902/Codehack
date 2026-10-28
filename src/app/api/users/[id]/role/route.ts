import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, publicUserSelect, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { roleSchema } from "@/lib/validation";

export const PATCH = handle(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const actor = await requireApiUser(["ADMIN"]);
    const { id } = await params;
    const { role } = await parseBody(req, roleSchema);

    // Stops the last admin from locking everyone out of role management.
    if (id === actor.id && role !== "ADMIN") {
      throw new ApiError(400, "You cannot remove your own admin role");
    }

    const target = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) throw new ApiError(404, "User not found");

    const user = await db.user.update({
      where: { id },
      data: { role },
      select: publicUserSelect,
    });
    await audit({
      actorId: actor.id,
      action: "user.role_changed",
      targetType: "User",
      targetId: id,
      metadata: { from: target.role, to: role },
    });
    return NextResponse.json({ user });
  },
);
