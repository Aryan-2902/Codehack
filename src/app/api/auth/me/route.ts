import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";

export const GET = handle(async () => {
  const user = await requireApiUser();
  return NextResponse.json({ user });
});
