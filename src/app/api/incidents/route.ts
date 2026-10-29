import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { loadIncidents } from "@/lib/incidents";

export const GET = handle(async () => {
  const user = await requireApiUser();
  const incidents = await loadIncidents(user);
  return NextResponse.json({ incidents });
});
