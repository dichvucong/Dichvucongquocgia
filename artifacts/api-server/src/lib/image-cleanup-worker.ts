import { expireImageUploads, processImageCleanup, queueOrphanedStaging, withCleanupTimeout } from "./image-cleanup";
import { deleteImageObject, listStagedImages } from "./image-files";
import { logger } from "./logger";

export function startImageCleanupWorker() {
  let running = false;
  let pageToken: string | undefined;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const expired = await expireImageUploads();
      // Deletion retries must keep running even if listing the storage bucket fails.
      const result = await processImageCleanup({ remove: deleteImageObject });
      if (expired || result.deleted || result.retried) {
        logger.info({ expired, ...result }, "Image storage cleanup finished");
      }
      try {
        const page = await withCleanupTimeout(listStagedImages(pageToken));
        await queueOrphanedStaging(page.objects);
        pageToken = page.nextPageToken;
      } catch {
        logger.warn("Unable to inventory staged images; will retry next cleanup cycle");
      }
    } catch {
      logger.error("Image cleanup cycle failed; durable jobs will be retried");
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => { void run(); }, 60_000);
  timer.unref();
  void run();
  return () => clearInterval(timer);
}
