import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { loadReviewQueue } from "@/lib/review";

// The reviewer's queue: pending, waitlisted and upcoming approved requests with their conflicts.
export const GET = handle(async () => {
  const user = await requireApiUser(["OWNER", "MANAGER", "ADMIN"]);
  const items = await loadReviewQueue(user);
  return NextResponse.json({ items });
});
