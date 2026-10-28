import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, requireApiUser, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { eligibilitySchema } from "@/lib/validation";

// Per-resource eligibility (the User–Resource pairing), e.g. "completed the laser-cutter induction".
// Only the resource's owner, or a Manager/Admin, may grant or revoke it.
async function authoriseForResource(actor: CurrentUser, resourceId: string) {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, ownerId: true },
  });
  if (!resource) throw new ApiError(404, "Resource not found");
  const isManager = actor.role === "MANAGER" || actor.role === "ADMIN";
  if (!isManager && resource.ownerId !== actor.id) {
    throw new ApiError(403, "Only the resource owner or a manager can change eligibility");
  }
}

export const POST = handle(async (req: Request) => {
  const actor = await requireApiUser(["OWNER", "MANAGER", "ADMIN"]);
  const { userId, resourceId, note } = await parseBody(req, eligibilitySchema);
  await authoriseForResource(actor, resourceId);

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new ApiError(404, "User not found");

  const grant = await db.eligibilityGrant.upsert({
    where: { userId_resourceId: { userId, resourceId } },
    create: { userId, resourceId, note, grantedById: actor.id },
    update: { note, grantedById: actor.id },
  });
  await audit({
    actorId: actor.id,
    action: "eligibility.granted",
    targetType: "Resource",
    targetId: resourceId,
    metadata: { userId, note: note ?? null },
  });
  return NextResponse.json({ grant }, { status: 201 });
});

export const DELETE = handle(async (req: Request) => {
  const actor = await requireApiUser(["OWNER", "MANAGER", "ADMIN"]);
  const { userId, resourceId } = await parseBody(req, eligibilitySchema);
  await authoriseForResource(actor, resourceId);

  await db.eligibilityGrant.deleteMany({ where: { userId, resourceId } });
  await audit({
    actorId: actor.id,
    action: "eligibility.revoked",
    targetType: "Resource",
    targetId: resourceId,
    metadata: { userId },
  });
  return NextResponse.json({ ok: true });
});
