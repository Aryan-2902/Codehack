import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  canViewResource,
  loadEditableResource,
  resourceInclude,
  splitInput,
} from "@/lib/resources";
import { resourceSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const resource = await db.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!resource || !canViewResource(user, resource)) {
    throw new ApiError(404, "Resource not found");
  }
  return NextResponse.json({ resource });
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const actor = await requireApiUser(["OWNER", "ADMIN"]);
  const { id } = await params;
  await loadEditableResource(actor, id);
  const input = await parseBody(req, resourceSchema);
  const { fields, slots, blackouts } = splitInput(input);

  // Slots and blackouts are replaced wholesale so the form is the source of truth.
  const [, resource] = await db.$transaction([
    db.availabilitySlot.deleteMany({ where: { resourceId: id } }),
    db.resource.update({
      where: { id },
      data: {
        ...fields,
        slots: { create: slots },
        blackouts: { deleteMany: {}, create: blackouts },
      },
      include: resourceInclude,
    }),
  ]);
  await audit({
    actorId: actor.id,
    action: "resource.updated",
    targetType: "Resource",
    targetId: id,
    metadata: { name: resource.name, status: resource.status },
  });
  return NextResponse.json({ resource });
});
