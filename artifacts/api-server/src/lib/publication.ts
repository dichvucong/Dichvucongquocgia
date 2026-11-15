import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, imagePublication, managedImages } from "@workspace/db";
import { GetCurrentImageResponse, ListAdminImagesResponseItem } from "@workspace/api-zod";

export const publicationEvents = new EventEmitter();
publicationEvents.setMaxListeners(200);

export function managedImageResponse(row: typeof managedImages.$inferSelect) {
  return ListAdminImagesResponseItem.parse({
    ...row,
    url: `/api/admin/images/${row.id}/file`,
    createdAt: row.createdAt.toISOString(),
  });
}

export async function currentImageResponse() {
  const [result] = await db.select({ publication: imagePublication, image: managedImages })
    .from(imagePublication)
    .leftJoin(managedImages, eq(imagePublication.imageId, managedImages.id))
    .where(eq(imagePublication.key, "current"));
  const row = result?.image;
  const revision = result?.publication.revision ?? "empty";
  return GetCurrentImageResponse.parse({
    revision,
    image: row?.status === "published" ? {
      id: row.id, title: row.title,
      url: `/api/content/images/${row.id}?v=${encodeURIComponent(revision)}`,
      publishedAt: result!.publication.updatedAt.toISOString(),
    } : null,
  });
}

export function newPublication(imageId: string | null) {
  return { key: "current", imageId, revision: randomUUID(), updatedAt: new Date() };
}

export class ContentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
