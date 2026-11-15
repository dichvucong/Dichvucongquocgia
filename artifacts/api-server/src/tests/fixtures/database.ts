import { randomUUID } from "node:crypto";
// A relative import deliberately bypasses the test runner's @workspace/db alias.
import { db, pool } from "../../../../../lib/db/src/index";

export { db, pool };
export * from "../../../../../lib/db/src/schema";

export const namespace = `admin_images_test_${randomUUID().replaceAll("-", "")}`;
// Set before the pool opens any connection. Every request/transaction, including
// concurrent ones, sees ONLY this namespace (no public search-path fallback).
pool.options.options = `-c search_path=${namespace} -c statement_timeout=10000 -c lock_timeout=5000`;
pool.options.application_name = namespace;

export async function createDatabaseFixture() {
  await pool.query(`CREATE SCHEMA "${namespace}"`);
  // No migrations or public-table dependency; a fresh development DB is enough.
  await pool.query(`
    CREATE TABLE managed_images (
      id uuid PRIMARY KEY, title text NOT NULL, file_name text NOT NULL,
      content_type text NOT NULL, size integer NOT NULL, object_path text NOT NULL,
      status text NOT NULL DEFAULT 'uploading', owner_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE image_publication (
      key text PRIMARY KEY, image_id uuid REFERENCES managed_images(id) ON DELETE SET NULL,
      revision text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE image_cleanup_jobs (
      object_path text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0, claim_token uuid,
      available_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
      last_error text
    );
    CREATE INDEX ON image_cleanup_jobs (available_at);
  `);
}

export async function resetDatabaseFixture() {
  await pool.query("TRUNCATE image_publication, managed_images, image_cleanup_jobs");
}

export async function destroyDatabaseFixture() {
  try {
    await pool.query(`DROP SCHEMA IF EXISTS "${namespace}" CASCADE`);
  } finally {
    await pool.end();
  }
}
