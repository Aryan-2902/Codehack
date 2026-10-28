import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;

// Signed upload to Cloudinary. Listing photos are public; private condition
// photos (a later feature) will need authenticated delivery.
export const POST = handle(async (req: Request) => {
  await requireApiUser(["OWNER", "ADMIN"]);

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    throw new ApiError(503, "Photo uploads are not configured on this server");
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No file provided");
  if (!file.type.startsWith("image/")) throw new ApiError(400, "Only images are allowed");
  if (file.size > MAX_BYTES) throw new ApiError(400, "Image must be under 5 MB");

  const folder = "campus-lab-share/resources";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
    .digest("hex");

  const body = new FormData();
  body.set("file", file);
  body.set("api_key", key);
  body.set("timestamp", timestamp);
  body.set("folder", folder);
  body.set("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(502, data.error?.message ?? "Upload failed");

  return NextResponse.json({ url: data.secure_url as string }, { status: 201 });
});
