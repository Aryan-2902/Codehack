import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { suggestResources } from "@/lib/ai/service";

const schema = z.object({
  need: z.string().trim().min(10, "Describe what you need in a few words").max(500),
});

// Suggestions only: this returns a ranked list to look at. It never books anything, and the
// eligibility shown with each suggestion is the same check the booking flow enforces.
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();
  const { need } = await parseBody(req, schema);
  return NextResponse.json(await suggestResources(user, need));
});
