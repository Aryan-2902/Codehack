import "server-only";
import { db } from "@/lib/db";
import { ApiError, type CurrentUser } from "@/lib/auth";

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTOS_PER_REPORT = 4;

/**
 * A report may only attach photos its author uploaded and that aren't already used elsewhere,
 * so nobody can pull someone else's private photo into their own report.
 */
export async function sanitizePhotoIds(user: CurrentUser, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return unique;

  const owned = await db.conditionPhoto.count({
    where: { id: { in: unique }, uploaderId: user.id },
  });
  if (owned !== unique.length) throw new ApiError(400, "One of the photos could not be found");

  const [reports, incidents] = await Promise.all([
    db.conditionReport.count({ where: { photos: { hasSome: unique } } }),
    db.incident.count({ where: { photos: { hasSome: unique } } }),
  ]);
  if (reports + incidents > 0) throw new ApiError(400, "A photo was already attached to another report");
  return unique;
}

type Parties = { requesterId: string; resource: { ownerId: string } };

function mayView(user: CurrentUser, b: Parties) {
  return (
    b.requesterId === user.id ||
    b.resource.ownerId === user.id ||
    user.role === "MANAGER" ||
    user.role === "ADMIN"
  );
}

/**
 * Private photos are visible to the uploader, the booking's two parties, and managers/admins.
 * (A photo not yet attached to anything is visible only to its uploader.)
 */
export async function canViewPhoto(user: CurrentUser, photo: { id: string; uploaderId: string }) {
  if (photo.uploaderId === user.id) return true;

  const select = { booking: { select: { requesterId: true, resource: { select: { ownerId: true } } } } };
  const [report, incident] = await Promise.all([
    db.conditionReport.findFirst({ where: { photos: { has: photo.id } }, select }),
    db.incident.findFirst({ where: { photos: { has: photo.id } }, select }),
  ]);
  const booking = report?.booking ?? incident?.booking;
  return booking ? mayView(user, booking) : false;
}
