import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { resourceInclude, splitInput } from "@/lib/resources";
import { resourceSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const user = await requireApiUser();
  const resources = await db.resource.findMany({
    // Retired listings are hidden except from their owner and admins.
    where:
      user.role === "ADMIN"
        ? undefined
        : { OR: [{ status: { not: "RETIRED" } }, { ownerId: user.id }] },
    include: { owner: resourceInclude.owner },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ resources });
});

export const POST = handle(async (req: Request) => {
  const actor = await requireApiUser(["OWNER", "ADMIN"]);
  const input = await parseBody(req, resourceSchema);
  const { fields, slots, blackouts } = splitInput(input);

  const resource = await db.resource.create({
    data: {
      ...fields,
      ownerId: actor.id,
      slots: { create: slots },
      blackouts: { create: blackouts },
    },
    include: resourceInclude,
  });
  await audit({
    actorId: actor.id,
    action: "resource.created",
    targetType: "Resource",
    targetId: resource.id,
    metadata: { name: resource.name, category: resource.category },
  });
  return NextResponse.json({ resource }, { status: 201 });
});
