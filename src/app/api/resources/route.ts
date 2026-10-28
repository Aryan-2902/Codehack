import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseSearch } from "@/lib/availability";
import { resourceInclude, splitInput } from "@/lib/resources";
import { searchResources } from "@/lib/search";
import { resourceSchema } from "@/lib/validation";

// Query params: q, category, location, date (YYYY-MM-DD), from/to (HH:MM), eligible=1
export const GET = handle(async (req: Request) => {
  const user = await requireApiUser();
  const search = parseSearch(Object.fromEntries(new URL(req.url).searchParams));
  const resources = await searchResources(user, search);
  return NextResponse.json({ resources, count: resources.length });
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
