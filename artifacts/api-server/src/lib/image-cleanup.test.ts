import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { pool, imageCleanupJobs, imagePublication, managedImages } from "@workspace/db";
import * as schema from "@workspace/db/schema";
import {
  canAdoptSanitizedImage, CLEANUP_LEASE_MS, cleanupRetryDelay, enqueueImageCleanup, expireImageUploads, imageMutationLock,
  processImageCleanup, queueOrphanedStaging, stagingCleanupAt, STAGING_RETENTION_MS,
  UPLOAD_LIFETIME_MS, withCleanupTimeout, type CleanupDatabase,
} from "./image-cleanup";
import { deleteImageObject, imageStorage, listStagedImages } from "./image-files";
import { objectStorageClient } from "./objectStorage";

// Real PostgreSQL, isolated namespace. Storage effects are injected; no live image is touched.
describe("durable image cleanup", { concurrency: false }, () => {
  const namespace = `image_cleanup_test_${randomUUID().replaceAll("-", "")}`;
  const connect = async () => pool.connect();
  let client: Awaited<ReturnType<typeof connect>>;
  let store: CleanupDatabase;
  const now = new Date("2030-01-01T12:00:00Z");
  const old = new Date(now.getTime() - 2 * STAGING_RETENTION_MS);
  const path = (kind = "uploads") => `/objects/${kind}/${randomUUID()}`;
  const fixture = (objectPath: string, status: string, createdAt = old) => ({
    id: randomUUID(), objectPath, status, createdAt, title: "Test image",
    fileName: "test.webp", contentType: "image/webp", size: 100, ownerId: "cleanup-test",
  });
  const jobs = () => store.select().from(imageCleanupJobs);
  before(async () => {
    client = await pool.connect();
    await client.query(`CREATE SCHEMA "${namespace}"`);
    await client.query(`SET search_path TO "${namespace}"`);
    await client.query(`
      CREATE TABLE managed_images (LIKE public.managed_images INCLUDING ALL);
      CREATE TABLE image_publication (LIKE public.image_publication INCLUDING ALL);
      CREATE TABLE image_cleanup_jobs (LIKE public.image_cleanup_jobs INCLUDING ALL);
    `);
    store = drizzle(client, { schema });
  });
  beforeEach(async () => {
    await client.query("TRUNCATE managed_images, image_publication, image_cleanup_jobs");
  });
  after(async () => {
    if (client) {
      await client.query("SET search_path TO public");
      await client.query(`DROP SCHEMA "${namespace}" CASCADE`);
      client.release();
    }
    await pool.end();
  });

  it("expires uploads atomically, including the exact boundary, but preserves drafts and publication references", async () => {
    const expired = fixture(path(), "uploading");
    const boundary = fixture(path(), "uploading", new Date(now.getTime() - UPLOAD_LIFETIME_MS));
    const active = fixture(path(), "uploading", new Date(now.getTime() - UPLOAD_LIFETIME_MS + 1));
    const draft = fixture(path("published"), "draft");
    const hidden = fixture(path("published"), "hidden");
    const published = fixture(path("published"), "published");
    const referenced = fixture(path(), "uploading");
    await store.insert(managedImages).values([expired, boundary, active, draft, hidden, published, referenced]);
    await store.insert(imagePublication).values({ key: "current", imageId: referenced.id, revision: randomUUID() });
    assert.equal(await expireImageUploads(store, now), 2);
    assert.equal(await expireImageUploads(store, now), 0);
    assert.deepEqual((await jobs()).map(j => j.objectPath).sort(), [expired.objectPath, boundary.objectPath].sort());
    assert.equal((await store.select().from(managedImages)).length, 5);
    const boundaryJob = (await jobs()).find(j => j.objectPath === boundary.objectPath)!;
    assert.equal(boundaryJob.availableAt.getTime(), stagingCleanupAt(boundary.createdAt).getTime());
  });

  it("keeps the reservation when enqueue fails rather than losing the cleanup intent", async () => {
    const invalid = fixture("/objects/unsafe-path", "uploading");
    await store.insert(managedImages).values(invalid);
    await assert.rejects(expireImageUploads(store, now), /Unsafe image cleanup path/);
    assert.equal((await store.select().from(managedImages)).length, 1);
    assert.equal((await jobs()).length, 0);
  });

  it("does not clean staging until its signed upload and in-flight-write grace period ends", async () => {
    const staged = path();
    await enqueueImageCleanup(store, staged, stagingCleanupAt(now));
    let calls = 0;
    const remove = async () => { calls++; };
    await processImageCleanup({ store, remove, now: () => new Date(now.getTime() + STAGING_RETENTION_MS - 1) });
    assert.equal(calls, 0);
    await processImageCleanup({ store, remove, now: () => stagingCleanupAt(now) });
    assert.equal(calls, 1);
  });

  it("persists storage failures, preserves retry backoff on duplicate enqueue, and succeeds idempotently", async () => {
    const objectPath = path("published");
    await enqueueImageCleanup(store, objectPath, now);
    const failed = await processImageCleanup({
      store, now: () => now, remove: async () => { throw new Error("Provider detail should not be stored"); },
    });
    assert.equal(failed.retried, 1);
    const [job] = await jobs();
    assert.equal(job.attempts, 1);
    assert.equal(job.lastError, "Storage delete failed");
    assert.equal(job.availableAt.getTime(), now.getTime() + 30_000);
    await enqueueImageCleanup(store, objectPath, now);
    assert.equal((await jobs())[0].attempts, 1);
    let calls = 0;
    const remove = async () => { calls++; };
    await processImageCleanup({ store, remove, now: () => now });
    assert.equal(calls, 0);
    // A new connection simulates restart: all retry state lives in PostgreSQL.
    const restartClient = await pool.connect();
    try {
      await restartClient.query(`SET search_path TO "${namespace}"`);
      const restartedStore = drizzle(restartClient, { schema });
      const retryNow = () => new Date(now.getTime() + 30_000);
      await processImageCleanup({ store: restartedStore, remove, now: retryNow });
      await processImageCleanup({ store: restartedStore, remove, now: retryNow });
    } finally {
      await restartClient.query("SET search_path TO public");
      restartClient.release();
    }
    assert.equal(calls, 1);
    assert.equal((await jobs()).length, 0);
    assert.equal(cleanupRetryDelay(100), STAGING_RETENTION_MS);
  });

  it("times out a stuck delete without dropping the job, and safely retries an ambiguous success", async () => {
    const objectPath = path();
    await enqueueImageCleanup(store, objectPath, now);
    let finish: (() => void) | undefined;
    const result = await processImageCleanup({
      store, now: () => now, timeoutMs: 10,
      remove: () => new Promise<void>(resolve => { finish = resolve; }),
    });
    assert.equal(result.retried, 1);
    assert.equal((await jobs())[0].lastError, "Storage cleanup timed out");
    // Remote operation may finish after the local timeout. Repeating an immutable-key delete is safe.
    finish!();
    await processImageCleanup({
      store, now: () => new Date(now.getTime() + 30_000), remove: async () => undefined,
    });
    assert.equal((await jobs()).length, 0);
  });

  it("protects every live reference even if an erroneous deletion job exists", async () => {
    const rows = ["uploading", "draft", "hidden", "published"].map(status => fixture(path("published"), status));
    await store.insert(managedImages).values(rows);
    for (const row of rows) await enqueueImageCleanup(store, row.objectPath, now);
    const result = await processImageCleanup({
      store, now: () => now, remove: async () => assert.fail("Live image must not be deleted"),
    });
    assert.equal(result.protected, 4);
    assert.equal((await jobs()).length, 4);
    assert.ok((await jobs()).every(j => j.attempts === 0));
  });

  it("queues only old, unreferenced staging from inventory, including historical orphan files", async () => {
    const orphan = path();
    const recent = path();
    const retained = fixture(path(), "draft");
    await store.insert(managedImages).values(retained);
    const inventory = [
      { objectPath: orphan, updatedAt: old },
      { objectPath: recent, updatedAt: now },
      { objectPath: retained.objectPath, updatedAt: old },
      { objectPath: path("published"), updatedAt: old },
      { objectPath: "/objects/uploads/not-an-image-id", updatedAt: old },
      { objectPath: path(), updatedAt: new Date("invalid") },
    ];
    await queueOrphanedStaging(inventory, store, now);
    await queueOrphanedStaging(inventory, store, now);
    assert.deepEqual((await jobs()).map(j => j.objectPath), [orphan]);
  });

  it("keeps admin mutations prompt during a stalled delete without allowing same-key adoption or duplicate deletion", async () => {
    const deletingPath = path("published");
    await enqueueImageCleanup(store, deletingPath, now);
    const draft = fixture(path("published"), "draft");
    await store.insert(managedImages).values(draft);
    const otherClient = await pool.connect();
    try {
      await otherClient.query(`SET search_path TO "${namespace}"`);
      await otherClient.query("BEGIN");
      await otherClient.query("SELECT pg_advisory_xact_lock(81634529)");
      const busy = await processImageCleanup({
        store, now: () => now, remove: async () => assert.fail("Other transaction owns mutation lock"),
      });
      assert.equal(busy.deleted, 0);
      await otherClient.query("COMMIT");
      let release: (() => void) | undefined;
      let started: (() => void) | undefined;
      const ready = new Promise<void>(resolve => { started = resolve; });
      const first = processImageCleanup({
        store, now: () => now,
        remove: () => { started!(); return new Promise<void>(resolve => { release = resolve; }); },
      });
      await ready;
      const otherStore = drizzle(otherClient, { schema });
      // Mirrors the short critical section used by completion/publish/hide/delete.
      // A lock timeout proves this cannot wait for the stalled storage request.
      await otherStore.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '150ms'`);
        await tx.execute(imageMutationLock);
        assert.equal(await canAdoptSanitizedImage(tx, deletingPath, now), false);
        await tx.update(managedImages).set({ status: "published" }).where(eq(managedImages.id, draft.id));
        await tx.insert(imagePublication).values({ key: "current", imageId: draft.id, revision: randomUUID() });
      });
      assert.equal((await store.select().from(imagePublication))[0].imageId, draft.id);
      const second = await processImageCleanup({
        store: otherStore, now: () => now,
        remove: async () => assert.fail("Second worker must not delete the same key"),
      });
      assert.equal(second.deleted, 0);
      release!();
      assert.equal((await first).deleted, 1);
      assert.equal((await store.select().from(managedImages))[0].status, "published");
    } finally {
      await otherClient.query("ROLLBACK");
      await otherClient.query("SET search_path TO public");
      otherClient.release();
    }
  });

  it("recovers expired claims and ignores a stale worker's acknowledgement after a new claim", async () => {
    const objectPath = path("published");
    await enqueueImageCleanup(store, objectPath, now);
    let release: (() => void) | undefined;
    let started: (() => void) | undefined;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const first = processImageCleanup({
      store, now: () => now, timeoutMs: 5_000,
      remove: () => { started!(); return new Promise<void>(resolve => { release = resolve; }); },
    });
    await ready;
    const [claim] = await jobs();
    assert.equal(claim.attempts, 1);
    assert.ok(claim.claimToken);
    const afterLease = new Date(now.getTime() + CLEANUP_LEASE_MS + 1);
    assert.equal(await canAdoptSanitizedImage(store, objectPath, now), false);
    await processImageCleanup({
      store, now: () => afterLease, remove: async () => { throw new Error("Retry failed"); },
    });
    assert.equal((await jobs())[0].attempts, 2);
    release!();
    await first;
    // The old success cannot erase the newer failure/backoff.
    assert.equal((await jobs()).length, 1);
    assert.equal((await jobs())[0].lastError, "Storage delete failed");
    await processImageCleanup({
      store, now: () => new Date(afterLease.getTime() + cleanupRetryDelay(2)), remove: async () => undefined,
    });
    assert.equal((await jobs()).length, 0);
    assert.equal(await canAdoptSanitizedImage(store, objectPath, now), false);
  });

  it("rolls back a deletion and its queued job together on database failure", async () => {
    const row = fixture(path("published"), "published");
    await store.insert(managedImages).values(row);
    await store.insert(imagePublication).values({ key: "current", imageId: row.id, revision: randomUUID() });
    await assert.rejects(store.transaction(async tx => {
      await tx.execute(imageMutationLock);
      await tx.update(imagePublication).set({ imageId: null });
      await enqueueImageCleanup(tx, row.objectPath, now);
      await tx.delete(managedImages).where(eq(managedImages.id, row.id));
      throw new Error("Simulated rollback");
    }), /Simulated rollback/);
    assert.equal((await jobs()).length, 0);
    assert.equal((await store.select().from(managedImages)).length, 1);
    assert.equal((await store.select().from(imagePublication))[0].imageId, row.id);
  });

  it("rejects unsafe keys and bounds successful and rejected storage promises", async () => {
    await assert.rejects(enqueueImageCleanup(store, "/objects/uploads/../../other", now), /Unsafe/);
    assert.equal(await withCleanupTimeout(Promise.resolve(42), 10), 42);
    await assert.rejects(withCleanupTimeout(Promise.reject(new Error("failed")), 10), /failed/);
  });

  it("storage deletion is idempotent and inventory stays inside the uploads prefix", async () => {
    const bucket = objectStorageClient.bucket;
    const privateDir = imageStorage.getPrivateObjectDir;
    imageStorage.getPrivateObjectDir = () => "/test-bucket/private";
    const id = randomUUID();
    let deletions = 0;
    try {
      Object.assign(objectStorageClient, {
        bucket: (bucketName: string) => {
          assert.equal(bucketName, "test-bucket");
          return {
            file: (name: string) => {
              assert.equal(name, `private/uploads/${id}`);
              return { delete: async (options: { ignoreNotFound: boolean }) => {
                assert.equal(options.ignoreNotFound, true);
                deletions++;
              } };
            },
            getFiles: async (options: { prefix: string; autoPaginate: boolean; pageToken: string }) => {
              assert.equal(options.prefix, "private/uploads/");
              assert.equal(options.autoPaginate, false);
              assert.equal(options.pageToken, "page-1");
              return [[{
                name: `private/uploads/${id}`,
                metadata: { timeCreated: old.toISOString(), updated: now.toISOString() },
              }], { pageToken: "page-2" }];
            },
          };
        },
      });
      await deleteImageObject(`/objects/uploads/${id}`);
      await deleteImageObject(`/objects/uploads/${id}`);
      assert.equal(deletions, 2);
      const page = await listStagedImages("page-1");
      assert.equal(page.nextPageToken, "page-2");
      assert.equal(page.objects[0].updatedAt.getTime(), now.getTime());
    } finally {
      objectStorageClient.bucket = bucket;
      imageStorage.getPrivateObjectDir = privateDir;
    }
  });
});
