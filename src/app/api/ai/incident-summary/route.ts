import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { summariseIncident } from "@/lib/ai/service";

const schema = z.object({ incidentId: z.string().min(1) });

// A neutral summary for the manager reviewing an incident. It is advisory: it never resolves an
// incident, recommends a penalty, or changes anything. Managers and admins only.
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser(["MANAGER", "ADMIN"]);
  const { incidentId } = await parseBody(req, schema);
  return NextResponse.json(await summariseIncident(user, incidentId));
});
