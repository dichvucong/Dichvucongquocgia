import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, imagePublication, managedImages } from "@workspace/db";
import { GetPublishedImageFileParams } from "@workspace/api-zod";
import { currentImageResponse, publicationEvents } from "../lib/publication";
import { streamImage } from "../lib/image-files";

const router: IRouter = Router();
router.use("/content", (_req, res, next) => {
  res.set("Cache-Control", "no-store, max-age=0"); next();
});
router.get("/content/current", async (_req, res): Promise<void> => {
  res.json(await currentImageResponse());
});
router.get("/content/images/:id", async (req, res): Promise<void> => {
  const params = GetPublishedImageFileParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Mã ảnh không hợp lệ." }); return; }
  const [result] = await db.select({ path: managedImages.objectPath })
    .from(imagePublication)
    .innerJoin(managedImages, eq(imagePublication.imageId, managedImages.id))
    .where(and(eq(imagePublication.key, "current"), eq(managedImages.id, params.data.id), eq(managedImages.status, "published")));
  if (!result) { res.status(404).json({ error: "Ảnh không được công bố." }); return; }
  await streamImage(result.path, res);
});

router.get("/content/events", (req, res) => {
  // Only publication change notifications; never includes identifiers or image metadata.
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 2000\n\n");
  const changed = () => res.write("event: publication-change\ndata: changed\n\n");
  publicationEvents.on("change", changed);
  const heartbeat = setInterval(() => res.write(": keepalive\n\n"), 20_000);
  req.on("close", () => {
    clearInterval(heartbeat);
    publicationEvents.off("change", changed);
  });
});

export default router;
