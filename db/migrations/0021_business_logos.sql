-- 0021_business_logos.sql — shop / towing LOGO uploads (owner order
-- 2026-11-20: "a shop can put a logo — a photo of their shop — on its
-- profile", shown to drivers in the nearby list and on the shop's
-- profile page).
--
-- The 0015 uploads table is keyed to driver accounts (owner_id →
-- users), and businesses are their own auth actors (shops /
-- towing_companies), so business logo bytes get their own table with
-- the same shape and discipline (JPEG/PNG/WebP, 5 MB — enforced in
-- lib/server/uploadService.ts, the listing-photo rules). Each
-- business carries at most one logo: logo_upload_id points at the
-- current row; replacing deletes the old row.
--
-- Reads tolerate this migration not being applied yet: profile and
-- nearby queries read logo_upload_id through to_jsonb(row)->>'…',
-- which yields NULL (no logo) instead of an error while the column
-- is absent. Logo WRITES fail honestly until this runs.

CREATE TABLE IF NOT EXISTS business_uploads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL,
  business_kind text NOT NULL CHECK (business_kind IN ('shop', 'towing')),
  -- 'logo' = the one profile logo (logo_upload_id points at it);
  -- 'gallery' = the shop's photo gallery, up to 4, oldest first.
  role          text NOT NULL DEFAULT 'logo' CHECK (role IN ('logo', 'gallery')),
  content_type  text NOT NULL,
  byte_size     integer NOT NULL,
  data          bytea NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_uploads_business_idx
  ON business_uploads (business_id, created_at DESC);

ALTER TABLE shops ADD COLUMN IF NOT EXISTS logo_upload_id uuid;
ALTER TABLE towing_companies ADD COLUMN IF NOT EXISTS logo_upload_id uuid;
