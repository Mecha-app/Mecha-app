-- 0015_uploads.sql — uploaded listing photos (owner order 2026-11-16:
-- "I want these to be upload pictures. Not link.")
--
-- The /sell guided-photo set used to take pasted photo LINKS. Sellers
-- now upload the actual photo files; the bytes live here, owned by the
-- uploading account, and the listing stores the same URL shape it
-- always did — the photo's serving path, /api/listings/photos/<id> —
-- so listing rows, the marketplace, and the listing page are untouched.
-- Serving is public (a marketplace photo is public by definition);
-- uploading requires a signed-in driver account (the route gate).

CREATE TABLE IF NOT EXISTS uploads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type  text NOT NULL,
  byte_size     integer NOT NULL,
  data          bytea NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS uploads_owner_idx ON uploads (owner_id, created_at DESC);
