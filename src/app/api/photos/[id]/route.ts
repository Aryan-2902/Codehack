import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { ApiError, requireApiUser } from "@/lib/auth";
import { canViewPhoto } from "@/lib/photos";

type Ctx = { params: Promise<{ id: string }> };

// Private image delivery: only the uploader, the booking's two parties, managers and admins.
// Everyone else gets the same 404 as a photo that doesn't exist.
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;

  const photo = await db.conditionPhoto.findUnique({ where: { id } });
  if (!photo || !(await canViewPhoto(user, photo))) throw new ApiError(404, "Photo not found");

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
