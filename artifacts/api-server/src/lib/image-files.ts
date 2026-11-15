import { randomUUID } from "node:crypto";
import type { Response } from "express";
import sharp from "sharp";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import { ContentError } from "./publication";
import { db } from "@workspace/db";
import { enqueueImageCleanup, STAGING_RETENTION_MS, type StagedObject } from "./image-cleanup";

export const imageStorage = new ObjectStorageService();
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Resolve directly: deleting an already absent key is successful (no existence-check race).
function imageObject(path: string) {
  const full = `${imageStorage.getPrivateObjectDir().replace(/\/$/, "")}/${path.slice("/objects/".length)}`;
  const parts = full.replace(/^\//, "").split("/");
  return objectStorageClient.bucket(parts[0]).file(parts.slice(1).join("/"));
}

export async function deleteImageObject(path: string) {
  await imageObject(path).delete({ ignoreNotFound: true });
}

export async function listStagedImages(pageToken?: string) {
  const root = imageStorage.getPrivateObjectDir().replace(/^\//, "").replace(/\/$/, "");
  const [bucket, ...prefix] = root.split("/");
  const base = `${prefix.join("/")}/`;
  const [files, next] = await objectStorageClient.bucket(bucket).getFiles({
    prefix: `${base}uploads/`, autoPaginate: false, maxResults: 100, pageToken,
  });
  const objects: StagedObject[] = files.map(file => ({
    objectPath: `/objects/${file.name.slice(base.length)}`,
    // Updated time also guards a recently overwritten old staging key.
    updatedAt: new Date(Math.max(
      Date.parse(file.metadata.timeCreated ?? ""),
      Date.parse(file.metadata.updated ?? ""),
    )),
  }));
  return { objects, nextPageToken: next?.pageToken };
}

export async function sanitizeUpload(objectPath: string, expectedType: string) {
  const input = await imageStorage.getObjectEntityFile(objectPath);
  const [metadata] = await input.getMetadata();
  if (Number(metadata.size) > MAX_IMAGE_BYTES) throw new ContentError(400, "Ảnh vượt quá 10 MB.");
  const stream = input.createReadStream();
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of stream) {
    length += chunk.length;
    if (length > MAX_IMAGE_BYTES) {
      stream.destroy();
      throw new ContentError(400, "Ảnh vượt quá 10 MB.");
    }
    chunks.push(Buffer.from(chunk));
  }
  const bytes = Buffer.concat(chunks);
  const actualType = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg"
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png"
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
  if (!actualType || actualType !== expectedType) throw new ContentError(400, "Nội dung ảnh không khớp định dạng JPG, PNG hoặc WebP đã khai báo.");
  let clean: Buffer;
  try {
    const image = sharp(bytes, { limitInputPixels: 25_000_000, animated: false, failOn: "error" });
    const info = await image.metadata();
    if ((info.pages ?? 1) > 1) throw new Error("Animated image");
    clean = await image.rotate().resize({ width: 3000, height: 5000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 }).toBuffer();
  } catch {
    throw new ContentError(400, "Ảnh hỏng, ảnh động hoặc kích thước quá lớn. Vui lòng chọn ảnh khác.");
  }
  // A new immutable key: an expiring upload URL can never overwrite published bytes.
  const finalPath = `/objects/published/${randomUUID()}`;
  // Register BEFORE writing so a crash or ambiguous storage timeout cannot orphan the new key.
  // Adoption into the draft removes this job in the same DB transaction.
  await enqueueImageCleanup(db, finalPath, new Date(Date.now() + STAGING_RETENTION_MS));
  const file = imageObject(finalPath);
  await file.save(clean, { resumable: false, timeout: 30_000, metadata: { contentType: "image/webp", cacheControl: "no-store" } });
  return { file, finalPath, size: clean.length };
}

export async function streamImage(path: string, res: Response) {
  const file = await imageStorage.getObjectEntityFile(path);
  res.set({
    "Content-Type": "image/webp",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'",
  });
  const stream = file.createReadStream();
  stream.on("error", () => {
    if (!res.headersSent) res.status(502).json({ error: "Không tải được ảnh." });
    else res.destroy();
  });
  stream.pipe(res);
}
