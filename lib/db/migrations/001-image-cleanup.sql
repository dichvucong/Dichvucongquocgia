BEGIN;
CREATE TABLE IF NOT EXISTS image_cleanup_jobs (
  object_path text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  claim_token uuid,
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_error text
);
ALTER TABLE image_cleanup_jobs ADD COLUMN IF NOT EXISTS claim_token uuid;
CREATE INDEX IF NOT EXISTS image_cleanup_jobs_available_at_idx
  ON image_cleanup_jobs (available_at);
COMMIT;
