-- 0001_foundation.sql — MECHA Neon Postgres schema (WP3 groundwork)
-- Implements MIGRATION_PLAN_V2_MONGO_TO_NEON.md §2 mapping rules, GROUNDED
-- in the real repo code (reconciliation 2026-11-03 — see STATUS.md; where
-- the plan/audit and the code disagreed, the code won):
--   * every table: id uuid PK (gen_random_uuid) + legacy_id text UNIQUE
--     (the Mongo ObjectId string — permanent traceability + ETL join key)
--   * embedded value-objects -> JSONB; owned/queryable children -> tables + FKs
--   * Mongo ISODate -> timestamptz; money -> numeric(10,2), never float
--   * bcrypt hashes carry over as-is (repo: bcryptjs, cost 12 — auth.js)
-- Apply in filename order via the Neon Console SQL Editor (Migration V2
-- Phase B — the sandbox-safe path). Idempotent where Postgres allows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared enums (only sets the repo actually constrains)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('free', 'pro');  -- users.plan (payments.js, admin.js)
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM ('pending', 'done', 'dismissed');
  -- used only by the WP5-new tables in 0007 (no legacy source)
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- updated_at maintenance (legacy models carry createdAt only — updated_at
-- is a rebuild addition on tables the new API mutates; harmless for ETL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Haversine distance (km) — nearby search without PostGIS.
-- Repo reality: shops/towing search uses Mongo $near on a 2dsphere
-- GeoJSON Point with radius in MILES (25 mi shops / 30 mi towing default,
-- limit 20 / 10, isActive only). Query code converts: km = miles x 1.60934.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric
) RETURNS double precision AS $$
  SELECT 6371.0 * 2 * asin(sqrt(
    sin(radians(($3 - $1) / 2.0)) ^ 2
    + cos(radians($1)) * cos(radians($3)) * sin(radians(($4 - $2) / 2.0)) ^ 2
  ));
$$ LANGUAGE sql IMMUTABLE;
