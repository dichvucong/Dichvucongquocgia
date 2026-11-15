import { randomUUID } from "node:crypto";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db, imageCleanupJobs, imagePublication, managedImages } from "@workspace/db";

// Shared only for SHORT database changes, never held during a storage request.
export const imageMutationLock = sql`SELECT pg_advisory_xact_lock(81634529)`;
export const UPLOAD_LIFETIME_MS = 20 * 60_000;
// Signed PUTs last 15 minutes. Allow another 45 minutes for in-flight/late writes.
export const STAGING_RETENTION_MS = 60 * 60_000;
export const CLEANUP_TIMEOUT_MS = 5_000;
export const CLEANUP_LEASE_MS = 60_000;
export type CleanupDatabase = Pick<typeof db, "select" | "insert" | "update" | "delete" | "execute" | "transaction">;

export function stagingCleanupAt(createdAt: Date) {
  return new Date(createdAt.getTime() + STAGING_RETENTION_MS);
}

export function isManagedImagePath(path: string) {
  return /^\/objects\/(uploads|published)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(path);
}

// Conflicts preserve existing attempts/backoff; repeated requests cannot reset a failing job.
export async function enqueueImageCleanup(store: CleanupDatabase, objectPath: string, availableAt = new Date()) {
  if (!isManagedImagePath(objectPath)) throw new Error("Unsafe image cleanup path");
  await store.insert(imageCleanupJobs).values({ objectPath, availableAt }).onConflictDoNothing();
}

// Must be checked under imageMutationLock in the same transaction as draft adoption.
// A claimed key is never reusable: a timed-out remote delete can still finish later.
export async function canAdoptSanitizedImage(store: CleanupDatabase, objectPath: string, now = new Date()) {
  const [job] = await store.select().from(imageCleanupJobs).where(eq(imageCleanupJobs.objectPath, objectPath));
  return Boolean(job && !job.claimToken && job.attempts === 0 && job.availableAt.getTime() > now.getTime());
}

export async function expireImageUploads(store: CleanupDatabase = db, now = new Date()) {
  return store.transaction(async tx => {
    await tx.execute(imageMutationLock);
    const expired = await tx.select().from(managedImages).where(and(
      eq(managedImages.status, "uploading"),
      lte(managedImages.createdAt, new Date(now.getTime() - UPLOAD_LIFETIME_MS)),
      sql`NOT EXISTS (SELECT 1 FROM ${imagePublication} WHERE ${imagePublication.imageId} = ${managedImages.id})`,
    )).limit(100);
    for (const row of expired) {
      await enqueueImageCleanup(tx, row.objectPath, stagingCleanupAt(row.createdAt));
      await tx.delete(managedImages).where(eq(managedImages.id, row.id));
    }
    return expired.length;
  });
}

export async function withCleanupTimeout<T>(work: Promise<T>, timeoutMs = CLEANUP_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Storage cleanup timed out")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function cleanupRetryDelay(attempts: number) {
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.min(Math.max(attempts - 1, 0), 7));
}

type CleanupOptions = {
  store?: CleanupDatabase;
  remove: (objectPath: string) => Promise<unknown>;
  now?: () => Date;
  timeoutMs?: number;
  batchSize?: number;
};

export async function processImageCleanup({
  store = db, remove, now = () => new Date(), timeoutMs = CLEANUP_TIMEOUT_MS, batchSize = 10,
}: CleanupOptions) {
  const result = { deleted: 0, retried: 0, protected: 0 };
  // Claim under the mutation lock, then release it BEFORE calling storage. An incremented
  // attempt is a permanent adoption barrier for this immutable key, even if a timed-out
  // delete finishes late. Only the current lease token can acknowledge a job.
  for (let i = 0; i < batchSize; i++) {
    const claim = await store.transaction(async tx => {
      const lock = await tx.execute<{ acquired: boolean }>(sql`SELECT pg_try_advisory_xact_lock(81634529) AS acquired`);
      if (!lock.rows[0]?.acquired) return null;
      const [job] = await tx.select().from(imageCleanupJobs)
        .where(lte(imageCleanupJobs.availableAt, now())).orderBy(asc(imageCleanupJobs.availableAt)).limit(1);
      if (!job) return null;
      // Protect ALL references, including valid drafts, hidden images and publication pointers.
      const [reference] = await tx.select({ id: managedImages.id }).from(managedImages)
        .where(eq(managedImages.objectPath, job.objectPath)).limit(1);
      if (reference) {
        await tx.update(imageCleanupJobs).set({ availableAt: new Date(now().getTime() + STAGING_RETENTION_MS) })
          .where(eq(imageCleanupJobs.objectPath, job.objectPath));
        return { protected: true } as const;
      }
      const claimToken = randomUUID();
      const attempts = job.attempts + 1;
      await tx.update(imageCleanupJobs).set({
        claimToken, attempts,
        // Also serves as a lease deadline: a crashed worker's claim becomes retryable.
        availableAt: new Date(now().getTime() + Math.max(CLEANUP_LEASE_MS, timeoutMs * 2)),
      }).where(eq(imageCleanupJobs.objectPath, job.objectPath));
      return { protected: false, objectPath: job.objectPath, claimToken, attempts } as const;
    });
    if (!claim) break;
    if (claim.protected) {
      result.protected++;
      continue;
    }
    const ownsClaim = and(
      eq(imageCleanupJobs.objectPath, claim.objectPath),
      eq(imageCleanupJobs.claimToken, claim.claimToken),
    );
    try {
      if (!isManagedImagePath(claim.objectPath)) throw new Error("Unsafe image cleanup path");
      await withCleanupTimeout(remove(claim.objectPath), timeoutMs);
      await store.delete(imageCleanupJobs).where(ownsClaim);
      result.deleted++;
    } catch (error) {
      await store.update(imageCleanupJobs).set({
        claimToken: null,
        availableAt: new Date(now().getTime() + cleanupRetryDelay(claim.attempts)),
        // Never persist signed URLs, provider responses, credentials or arbitrary error messages.
        lastError: error instanceof Error && error.message === "Storage cleanup timed out"
          ? "Storage cleanup timed out" : "Storage delete failed",
      }).where(ownsClaim);
      result.retried++;
    }
  }
  return result;
}

export type StagedObject = { objectPath: string; updatedAt: Date };

// Inventory catches old staging files whose reservation was removed by older server versions.
export async function queueOrphanedStaging(
  objects: StagedObject[], store: CleanupDatabase = db, now = new Date(),
) {
  let queued = 0;
  for (const object of objects) {
    if (!object.objectPath.startsWith("/objects/uploads/") || !isManagedImagePath(object.objectPath)
      || !Number.isFinite(object.updatedAt.getTime())
      || object.updatedAt.getTime() > now.getTime() - STAGING_RETENTION_MS) continue;
    await store.transaction(async tx => {
      await tx.execute(imageMutationLock);
      const [reference] = await tx.select({ id: managedImages.id }).from(managedImages)
        .where(eq(managedImages.objectPath, object.objectPath)).limit(1);
      if (reference) return;
      await enqueueImageCleanup(tx, object.objectPath, now);
      queued++;
    });
  }
  return queued;
}
