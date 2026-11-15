import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, beforeEach, describe, it } from "node:test";
import express, { type ErrorRequestHandler } from "express";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db, pool, managedImages, imagePublication, imageCleanupJobs } from "@workspace/db";
import adminRouter from "../routes/admin-images";
import contentRouter from "../routes/content";
import { adminLimiter } from "../middlewares/admin";
import { ContentError, publicationEvents } from "../lib/publication";
import { ObjectNotFoundError } from "../lib/objectStorage";
import {
  createDatabaseFixture, destroyDatabaseFixture, namespace, resetDatabaseFixture,
} from "./fixtures/database";
import { authRequests, clerkCalls, identities, type Identity } from "./fixtures/clerk";
import { installStorageFixture, objects, reads, resetStorageFixture, writes } from "./fixtures/storage";

describe("Admin image security regressions (real routes, middleware, PostgreSQL and sharp)", { concurrency: false }, () => {
  let server: Server | undefined;
  let base: string;
  let restoreStorage: (() => void) | undefined;
  let png: Buffer;
  const previousEmails = process.env.ADMIN_EMAILS;

  async function request(path: string, {
    method = "GET", identity = "admin", body, origin,
  }: {
    method?: string; identity?: Identity | null; body?: unknown; origin?: string | null;
  } = {}) {
    const headers: Record<string, string> = {};
    if (identity) headers["x-fixture-identity"] = identity;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (origin !== null) headers.Origin = origin ?? base;
    const response = await fetch(`${base}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      status: response.status, headers: response.headers, bytes,
      json: response.headers.get("content-type")?.includes("application/json")
        ? JSON.parse(bytes.toString()) : undefined,
    };
  }

  async function seed(status = "draft", ownerId = "admin") {
    const row = {
      id: randomUUID(), title: `Fixture ${status}`, fileName: "fixture.webp",
      contentType: "image/webp", size: 100, ownerId, status,
      objectPath: `/objects/${status === "uploading" ? "uploads" : "published"}/${randomUUID()}`,
    };
    await db.insert(managedImages).values(row);
    objects.set(row.objectPath, { bytes: await sharp(png).webp().toBuffer(), contentType: "image/webp" });
    return row;
  }

  async function reserve(contentType = "image/png", identity: Identity = "admin") {
    const result = await request("/api/admin/images/upload-url", {
      method: "POST", identity,
      body: { title: "Synthetic upload", fileName: "fixture.png", contentType, size: png.length },
    });
    assert.equal(result.status, 201);
    const [row] = await db.select().from(managedImages).where(eq(managedImages.id, result.json.uploadId));
    assert.ok(row);
    objects.set(row.objectPath, { bytes: png, contentType });
    return row;
  }

  const publish = (id: string) => request(`/api/admin/images/${id}/publish`, { method: "POST" });

  before(async () => {
    await createDatabaseFixture();
    restoreStorage = installStorageFixture();
    png = await sharp({ create: { width: 3, height: 2, channels: 3, background: "#4682b4" } }).png().toBuffer();
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      const identity = req.get("x-fixture-identity") as Identity | undefined;
      if (identity) authRequests.set(req, identity);
      // Minimal request logger for the middleware's explicit fail-closed path.
      req.log = { error: () => undefined } as unknown as typeof req.log;
      next();
    });
    app.use("/api", adminRouter, contentRouter);
    app.use(((error, _req, res, _next) => {
      if (error instanceof ContentError) res.status(error.status).json({ error: error.message });
      else if (error instanceof ObjectNotFoundError) res.status(404).json({ error: "Missing fixture object" });
      else res.status(500).json({ error: "Unexpected test application failure" });
    }) as ErrorRequestHandler);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server!.once("listening", resolve);
      server!.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    base = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await resetDatabaseFixture();
    resetStorageFixture();
    clerkCalls.length = 0;
    process.env.ADMIN_EMAILS = "";
    for (const key of ["anonymous-admin", ...Object.keys(identities), "unavailable"]) adminLimiter.resetKey(key);
  });

  after(async () => {
    try {
      if (server) {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
      }
    } finally {
      restoreStorage?.();
      if (previousEmails === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = previousEmails;
      await destroyDatabaseFixture();
      assert.equal(publicationEvents.listenerCount("change"), 0);
    }
  });

  for (const [identity, expected] of [[null, 401], ["member", 403]] as const) {
    it(`returns ${expected} for ${identity ?? "anonymous"} on every protected image operation without side effects`, async () => {
      const image = await seed();
      const endpoints = [
        ["GET", "/api/admin/images"],
        ["POST", "/api/admin/images/upload-url"],
        ["POST", `/api/admin/images/${image.id}/complete`],
        ["POST", `/api/admin/images/${image.id}/publish`],
        ["POST", `/api/admin/images/${image.id}/hide`],
        ["DELETE", `/api/admin/images/${image.id}`],
        ["GET", `/api/admin/images/${image.id}/file`],
      ];
      const beforeRows = await db.select().from(managedImages);
      for (const [method, path] of endpoints) {
        const response = await request(path, { method, identity });
        assert.equal(response.status, expected, `${method} ${path}`);
        assert.equal(response.headers.get("cache-control"), "no-store");
      }
      assert.deepEqual(await db.select().from(managedImages), beforeRows);
      assert.deepEqual(await db.select().from(imagePublication), []);
      assert.deepEqual(await db.select().from(imageCleanupJobs), []);
      assert.deepEqual(reads, []);
      assert.deepEqual(writes, []);
      if (!identity) assert.deepEqual(clerkCalls, []);
    });
  }

  it("does not auto-grant Admin or trust client-editable role metadata", async () => {
    assert.equal((await request("/api/admin/session", { identity: null })).status, 401);
    const member = await request("/api/admin/session", { identity: "member" });
    assert.equal(member.status, 200);
    assert.deepEqual(member.json, { isAdmin: false, configured: false });
    const admin = await request("/api/admin/session");
    assert.deepEqual(admin.json, { isAdmin: true, configured: true });
    assert.equal((await request("/api/admin/images")).status, 200);
  });

  it("allows only verified allowlisted email and fails closed when identity lookup fails", async () => {
    process.env.ADMIN_EMAILS = " ALLOWED@EXAMPLE.INVALID ";
    assert.equal((await request("/api/admin/images", { identity: "verified" })).status, 200);
    assert.equal((await request("/api/admin/images", { identity: "unverified" })).status, 403);
    assert.equal((await request("/api/admin/images", { identity: "member" })).status, 403);
    assert.equal((await request("/api/admin/images", { identity: "unavailable" })).status, 503);
  });

  it("blocks missing, foreign and malformed mutation origins, even for Admin", async () => {
    const row = await seed();
    for (const origin of [null, "https://foreign.example.invalid", "not-a-url"]) {
      assert.equal((await request(`/api/admin/images/${row.id}/publish`, { method: "POST", origin })).status, 403);
    }
    assert.equal((await db.select().from(managedImages))[0].status, "draft");
    assert.deepEqual(await db.select().from(imagePublication), []);
    assert.equal((await publish(row.id)).status, 200);
  });

  it("rejects unsupported MIME and oversized upload declarations without reserving files", async () => {
    for (const body of [
      { title: "SVG", fileName: "fixture.svg", contentType: "image/svg+xml", size: 20 },
      { title: "Large", fileName: "fixture.png", contentType: "image/png", size: 10 * 1024 * 1024 + 1 },
    ]) {
      assert.equal((await request("/api/admin/images/upload-url", { method: "POST", body })).status, 400);
    }
    assert.deepEqual(await db.select().from(managedImages), []);
    assert.equal(objects.size, 0);
  });

  for (const kind of ["text disguised as PNG", "PNG declared as JPEG", "truncated PNG magic header"]) {
    it(`rejects spoofed MIME: ${kind}, using the real sanitizer`, async () => {
      const row = await reserve(kind === "PNG declared as JPEG" ? "image/jpeg" : "image/png");
      const bytes = kind === "text disguised as PNG" ? Buffer.from("<script>not an image</script>")
        : kind === "truncated PNG magic header" ? png.subarray(0, 12) : png;
      objects.set(row.objectPath, { bytes, contentType: row.contentType });
      const result = await request(`/api/admin/images/${row.id}/complete`, { method: "POST" });
      assert.equal(result.status, 400);
      const [unchanged] = await db.select().from(managedImages);
      assert.equal(unchanged.status, "uploading");
      assert.equal(unchanged.objectPath, row.objectPath);
      assert.deepEqual(writes, []);
      assert.deepEqual(await db.select().from(imagePublication), []);
      assert.equal((await request("/api/content/current", { identity: null })).json.image, null);
      assert.equal((await request(`/api/content/images/${row.id}`, { identity: null })).status, 404);
    });
  }

  it("completes valid bytes as a private WebP draft, queues staging cleanup, and protects upload ownership", async () => {
    process.env.ADMIN_EMAILS = "allowed@example.invalid";
    const other = await reserve("image/png", "verified");
    assert.equal((await request(`/api/admin/images/${other.id}/complete`, { method: "POST" })).status, 404);
    assert.equal((await db.select().from(managedImages).where(eq(managedImages.id, other.id)))[0].status, "uploading");
    assert.deepEqual(reads, []);
    const row = await reserve();
    const result = await request(`/api/admin/images/${row.id}/complete`, { method: "POST" });
    assert.equal(result.status, 200);
    assert.equal(result.json.status, "draft");
    assert.equal(result.json.contentType, "image/webp");
    const [draft] = await db.select().from(managedImages).where(eq(managedImages.id, row.id));
    assert.match(draft.objectPath, /^\/objects\/published\//);
    assert.notEqual(draft.objectPath, row.objectPath);
    assert.equal((await sharp(objects.get(draft.objectPath)!.bytes).metadata()).format, "webp");
    assert.deepEqual(writes, [draft.objectPath]);
    assert.deepEqual((await db.select().from(imageCleanupJobs)).map(job => job.objectPath), [row.objectPath]);
    const library = await request("/api/admin/images");
    assert.equal(library.status, 200);
    assert.deepEqual(library.json.map((image: { id: string }) => image.id), [row.id]);
    const preview = await request(result.json.url);
    assert.equal(preview.status, 200);
    assert.deepEqual(preview.bytes, objects.get(draft.objectPath)!.bytes);
    assert.equal((await request("/api/content/current", { identity: null })).json.image, null);
    assert.equal((await request(`/api/content/images/${row.id}`, { identity: null })).status, 404);
    assert.deepEqual(await db.select().from(imagePublication), []);
  });

  it("never exposes uploading, draft or hidden bytes, even with a stale publication pointer", async () => {
    for (const status of ["uploading", "draft", "hidden"]) {
      const row = await seed(status);
      await db.insert(imagePublication).values({ key: "current", imageId: row.id, revision: randomUUID() })
        .onConflictDoUpdate({ target: imagePublication.key, set: { imageId: row.id } });
      const current = await request("/api/content/current", { identity: null });
      assert.equal(current.status, 200);
      assert.equal(current.json.image, null);
      assert.match(current.headers.get("cache-control")!, /no-store/);
      assert.equal((await request(`/api/content/images/${row.id}`, { identity: null })).status, 404);
      assert.equal((await request(`/api/admin/images/${row.id}/file`, { identity: null })).status, 401);
    }
    assert.deepEqual(reads, [], "Rejected public access must never reach storage");
  });

  it("atomically replaces publication and revokes the previous public URL", async () => {
    const first = await seed();
    const second = await seed();
    const a = await publish(first.id);
    assert.equal(a.status, 200);
    assert.equal(a.json.image.id, first.id);
    const oldURL = a.json.image.url;
    const visible = await request(oldURL, { identity: null });
    assert.equal(visible.status, 200);
    assert.equal(visible.headers.get("content-type"), "image/webp");
    assert.match(visible.headers.get("cache-control")!, /no-store/);
    assert.equal(visible.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(visible.bytes, objects.get(first.objectPath)!.bytes);
    const b = await publish(second.id);
    assert.equal(b.status, 200);
    assert.notEqual(b.json.revision, a.json.revision);
    assert.equal((await request(oldURL, { identity: null })).status, 404);
    assert.equal((await request(b.json.image.url, { identity: null })).status, 200);
    assert.equal((await db.select().from(managedImages).where(eq(managedImages.id, first.id)))[0].status, "hidden");
  });

  it("serializes overlapping publish requests on separate connections and leaves exactly one current image", async () => {
    const initial = await seed();
    const first = await seed();
    const second = await seed();
    const old = await publish(initial.id);
    assert.equal(old.status, 200);
    const blocker = await pool.connect();
    const pending: ReturnType<typeof publish>[] = [];
    try {
      await blocker.query("BEGIN");
      await blocker.query("SELECT pg_advisory_xact_lock(81634529)");
      pending.push(publish(first.id), publish(second.id));
      // A barrier proves BOTH requests reached the real PostgreSQL mutation
      // lock before either may commit. Promise.all alone would not prove this.
      let waiters = 0;
      const deadline = Date.now() + 3_000;
      do {
        const result = await pool.query(`
          SELECT count(*)::int AS count FROM pg_locks l
          JOIN pg_stat_activity a USING (pid)
          WHERE l.locktype = 'advisory' AND l.objid = 81634529 AND NOT l.granted
            AND a.application_name = $1
        `, [namespace]);
        waiters = result.rows[0].count;
        if (waiters < 2) await delay(10);
      } while (waiters < 2 && Date.now() < deadline);
      assert.equal(waiters, 2, "Both publish requests must overlap on separate DB connections");
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
      // Drain requests before any fixture cleanup, including a failed assertion.
      await Promise.allSettled(pending);
    }
    const results = await Promise.all(pending);
    assert.ok(results.every(response => response.status === 200));
    const rows = await db.select().from(managedImages);
    const published = rows.filter(row => row.status === "published");
    assert.equal(published.length, 1);
    assert.ok(published[0].id === first.id || published[0].id === second.id);
    const pointers = await db.select().from(imagePublication);
    assert.equal(pointers.length, 1);
    assert.equal(pointers[0].imageId, published[0].id);
    const current = await request("/api/content/current", { identity: null });
    assert.equal(current.json.image.id, published[0].id);
    assert.equal((await request(current.json.image.url, { identity: null })).status, 200);
    for (const row of rows.filter(row => row.id !== published[0].id)) {
      assert.equal(row.status, "hidden");
      assert.equal((await request(`/api/content/images/${row.id}`, { identity: null })).status, 404);
    }
    assert.equal((await request(old.json.image.url, { identity: null })).status, 404);
  });

  for (const operation of ["hide", "delete"]) {
    it(`${operation} immediately revokes the exact old URL while stored bytes still exist`, async () => {
      const row = await seed();
      const published = await publish(row.id);
      assert.equal(published.status, 200);
      const url = published.json.image.url;
      assert.equal((await request(url, { identity: null })).status, 200);
      const result = await request(`/api/admin/images/${row.id}${operation === "hide" ? "/hide" : ""}`, {
        method: operation === "hide" ? "POST" : "DELETE",
      });
      assert.equal(result.status, 200);
      const current = await request("/api/content/current", { identity: null });
      assert.equal(current.json.image, null);
      assert.notEqual(current.json.revision, published.json.revision);
      reads.length = 0;
      const revoked = await request(url, { identity: null });
      assert.equal(revoked.status, 404);
      assert.match(revoked.headers.get("cache-control")!, /no-store/);
      assert.deepEqual(reads, []);
      assert.ok(objects.has(row.objectPath), "Revocation must not rely on physical deletion");
      const remaining = await db.select().from(managedImages).where(eq(managedImages.id, row.id));
      const jobs = await db.select().from(imageCleanupJobs);
      if (operation === "hide") {
        assert.equal(remaining[0].status, "hidden");
        assert.equal(jobs.length, 0);
        assert.equal((await request(`/api/admin/images/${row.id}/file`)).status, 200);
      } else {
        assert.equal(remaining.length, 0);
        assert.deepEqual(jobs.map(job => job.objectPath), [row.objectPath]);
        assert.equal((await request(`/api/admin/images/${row.id}/file`)).status, 404);
      }
    });
  }
});
