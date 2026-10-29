import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/photos";

// Upload one private photo for a condition report or incident. The returned id is attached to the
// report when it's submitted; the image itself is only served through /api/photos/[id].
export const POST = handle(async (req: Request) => {
  const user = await requireApiUser();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No file provided");
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw new ApiError(400, "Photos must be JPEG, PNG or WebP images");
  }
  if (file.size > MAX_PHOTO_BYTES) throw new ApiError(400, "Each photo must be under 2 MB");

  const photo = await db.conditionPhoto.create({
    data: {
      uploaderId: user.id,
      mimeType: file.type,
      data: Buffer.from(await file.arrayBuffer()),
    },
    select: { id: true },
  });
  return NextResponse.json({ id: photo.id }, { status: 201 });
});
