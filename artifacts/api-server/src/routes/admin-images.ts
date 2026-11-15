import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, imageCleanupJobs, imagePublication, managedImages } from "@workspace/db";
import {
  RequestImageUploadBody, RequestImageUploadResponse, CompleteImageUploadParams,
  PublishImageParams, HideImageParams, DeleteAdminImageParams, GetAdminImageFileParams,
  GetAdminSessionResponse, ListAdminImagesResponse, DeleteAdminImageResponse,
} from "@workspace/api-zod";
import { requireAdmin, adminLimiter, sameOriginMutation, isAdministrator, adminConfigured } from "../middlewares/admin";
import { currentImageResponse, managedImageResponse, newPublication, publicationEvents, ContentError } from "../lib/publication";
import { imageStorage, sanitizeUpload, streamImage } from "../lib/image-files";
import { canAdoptSanitizedImage, enqueueImageCleanup, expireImageUploads, imageMutationLock, stagingCleanupAt, UPLOAD_LIFETIME_MS } from "../lib/image-cleanup";

const router: IRouter = Router();
const lock = imageMutationLock;
router.use("/admin", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/admin/session", adminLimiter, async (req, res): Promise<void> => {
  if (!getAuth(req).userId) { res.status(401).json({ error: "Vui lòng đăng nhập." }); return; }
  const isAdmin = await isAdministrator(req);
  res.json(GetAdminSessionResponse.parse({ isAdmin, configured: adminConfigured() || isAdmin }));
});
router.use("/admin/images", adminLimiter, requireAdmin, sameOriginMutation);
router.get("/admin/images", async (_req, res): Promise<void> => {
  const rows = await db.select().from(managedImages).where(sql`${managedImages.status} <> 'uploading'`).orderBy(desc(managedImages.createdAt));
  res.json(ListAdminImagesResponse.parse(rows.map(managedImageResponse)));
});
router.post("/admin/images/upload-url", async (req, res): Promise<void> => {
  const body = RequestImageUploadBody.safeParse(req.body);
  if (!body.success || !body.data.title.trim()) { res.status(400).json({ error: "Tên ảnh, tiêu đề, loại ảnh hoặc dung lượng không hợp lệ (tối đa 10 MB)." }); return; }
  const userId = getAuth(req).userId!;
  // Expired/abandoned reservations must not permanently exhaust the upload quota.
  await expireImageUploads();
  const [pending] = await db.select({ count: sql<number>`count(*)::int` }).from(managedImages)
    .where(and(eq(managedImages.ownerId, userId), eq(managedImages.status, "uploading")));
  if (pending.count >= 30) { res.status(429).json({ error: "Có quá nhiều ảnh đang chờ tải. Vui lòng liên hệ quản trị hệ thống." }); return; }
  const uploadURL = await imageStorage.getObjectEntityUploadURL();
  const path = imageStorage.normalizeObjectEntityPath(uploadURL);
  if (!path.startsWith("/objects/uploads/")) throw new Error("Invalid storage reservation path");
  const id = randomUUID();
  await db.insert(managedImages).values({
    id, title: body.data.title.trim(), fileName: body.data.fileName,
    size: body.data.size, contentType: body.data.contentType, objectPath: path, ownerId: userId, status: "uploading",
  });
  res.status(201).json(RequestImageUploadResponse.parse({ uploadURL, uploadId: id }));
});
router.post("/admin/images/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteImageUploadParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Mã ảnh không hợp lệ." }); return; }
  const [row] = await db.select().from(managedImages).where(eq(managedImages.id, params.data.id));
  if (!row || row.ownerId !== getAuth(req).userId) { res.status(404).json({ error: "Không tìm thấy lượt tải." }); return; }
  if (row.status !== "uploading") { res.json(managedImageResponse(row)); return; }
  if (Date.now() - row.createdAt.getTime() >= UPLOAD_LIFETIME_MS) {
    await expireImageUploads();
    res.status(410).json({ error: "Lượt tải đã hết hạn. Vui lòng tải lại." }); return;
  }
  const clean = await sanitizeUpload(row.objectPath, row.contentType);
  const saved = await db.transaction(async tx => {
      await tx.execute(lock);
      const [existing] = await tx.select().from(managedImages).where(eq(managedImages.id, row.id));
      if (!existing || existing.status !== "uploading") throw new ContentError(409, "Ảnh đã được xử lý. Hãy tải lại thư viện.");
      if (Date.now() - existing.createdAt.getTime() >= UPLOAD_LIFETIME_MS) throw new ContentError(410, "Lượt tải đã hết hạn. Vui lòng tải lại.");
      // A sanitizer that outlives the retention window must never adopt a key already being deleted.
      if (!await canAdoptSanitizedImage(tx, clean.finalPath)) {
        throw new ContentError(410, "Lượt xử lý ảnh đã hết hạn. Vui lòng tải lại.");
      }
      const [updated] = await tx.update(managedImages).set({ objectPath: clean.finalPath, size: clean.size, contentType: "image/webp", status: "draft" })
        .where(eq(managedImages.id, row.id)).returning();
      await tx.delete(imageCleanupJobs).where(eq(imageCleanupJobs.objectPath, clean.finalPath));
      await enqueueImageCleanup(tx, row.objectPath, stagingCleanupAt(row.createdAt));
      return updated;
    });
  // Both staging and failed/abandoned sanitized writes are handled by durable cleanup jobs.
  res.json(managedImageResponse(saved));
});

router.post("/admin/images/:id/publish", async (req, res): Promise<void> => {
  const params = PublishImageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Mã ảnh không hợp lệ." }); return; }
  await db.transaction(async tx => {
    await tx.execute(lock);
    const [row] = await tx.select().from(managedImages).where(eq(managedImages.id, params.data.id));
    if (!row || row.status === "uploading") throw new ContentError(404, "Ảnh chưa sẵn sàng để công bố.");
    await imageStorage.getObjectEntityFile(row.objectPath);
    await tx.update(managedImages).set({ status: "hidden" }).where(eq(managedImages.status, "published"));
    await tx.update(managedImages).set({ status: "published" }).where(eq(managedImages.id, row.id));
    const current = newPublication(row.id);
    await tx.insert(imagePublication).values(current).onConflictDoUpdate({ target: imagePublication.key, set: current });
  });
  publicationEvents.emit("change");
  res.json(await currentImageResponse());
});
router.post("/admin/images/:id/hide", async (req, res): Promise<void> => {
  const params = HideImageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Mã ảnh không hợp lệ." }); return; }
  await db.transaction(async tx => {
    await tx.execute(lock);
    const [row] = await tx.select().from(managedImages).where(eq(managedImages.id, params.data.id));
    if (!row || row.status === "uploading") throw new ContentError(404, "Không tìm thấy ảnh.");
    await tx.update(managedImages).set({ status: "hidden" }).where(eq(managedImages.id, row.id));
    const [publication] = await tx.select().from(imagePublication).where(eq(imagePublication.key, "current"));
    if (publication?.imageId === row.id) await tx.update(imagePublication).set(newPublication(null)).where(eq(imagePublication.key, "current"));
  });
  publicationEvents.emit("change");
  res.json(await currentImageResponse());
});
router.delete("/admin/images/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminImageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Mã ảnh không hợp lệ." }); return; }
  await db.transaction(async tx => {
    await tx.execute(lock);
    const [row] = await tx.select().from(managedImages).where(eq(managedImages.id, params.data.id));
    if (!row) throw new ContentError(404, "Không tìm thấy ảnh.");
    const [publication] = await tx.select().from(imagePublication).where(eq(imagePublication.key, "current"));
    if (publication?.imageId === row.id) await tx.update(imagePublication).set(newPublication(null)).where(eq(imagePublication.key, "current"));
    await enqueueImageCleanup(tx, row.objectPath, row.status === "uploading" ? stagingCleanupAt(row.createdAt) : new Date());
    await tx.delete(managedImages).where(eq(managedImages.id, row.id));
  });
  publicationEvents.emit("change");
  res.json(DeleteAdminImageResponse.parse({ ok: true }));
});
router.get("/admin/images/:id/file", async (req, res): Promise<void> => {
  const params = GetAdminImageFileParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Mã ảnh không hợp lệ." }); return; }
  const [row] = await db.select().from(managedImages).where(eq(managedImages.id, params.data.id));
  if (!row || row.status === "uploading") { res.status(404).json({ error: "Không tìm thấy ảnh." }); return; }
  await streamImage(row.objectPath, res);
});
export default router;
