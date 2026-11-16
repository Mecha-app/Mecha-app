-- 0008_wp5_identity_quota.sql — WP5: persistent identity + LIFETIME free quota
-- OWNER'S HARD RULES (Frantz, 2026-11-03 — these supersede the legacy
-- monthly-quota semantics wherever the two disagree):
--   * 5 free diagnoses per account identity, LIFETIME — not per month,
--     not per login, not per browser.
--   * Identity is keyed to BOTH email and phone (normalized). Re-registering
--     with the same email OR the same phone reattaches to the existing
--     identity and its quota state — the count NEVER resets.
--   * The old app lost the count twice over: (1) users.diagnosisCount was
--     a runtime field the Mongoose schema omitted, so strict mode stripped
--     the writes; (2) the dashboard ALSO kept a client-side localStorage
--     counter (mechaCount) that reset monthly in the browser. WP5 keeps
--     the count ONLY here, server-side, on the user row.
-- The legacy columns users.diagnosis_count / diagnosis_reset_date are
-- KEPT for ETL parity with the Mongo source but are NOT read or written
-- by WP5 code — free_diagnoses_used below is the single source of truth.

-- Normalized phone = the second identity key. Stored beside the display
-- phone so lookups never re-derive it differently in two places.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_normalized text;
-- ETL/registration backfill rule: phone_normalized = normalizePhone(phone)
-- (see lib/server/identity.ts — digits, US country code folded to +1…).

-- One identity per phone number, across all accounts, forever.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_normalized_idx
  ON users (phone_normalized) WHERE phone_normalized IS NOT NULL;

-- The lifetime free-diagnosis counter. Incremented transactionally
-- BEFORE the AI provider is called (see lib/server/store.ts
-- consumeFreeDiagnosis — a single conditional UPDATE, so a blocked
-- user can never trigger a paid AI call and two concurrent requests
-- can never both take the last free slot).
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_diagnoses_used int NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Diagnosis answer cache (WP5). Key = sha256 over the normalized
-- (problem, vehicleInfo, language, tier) — exact-match only. Consulted
-- AFTER the quota consume and BEFORE the provider call, so a cache hit
-- saves the owner a paid AI call at zero correctness risk (identical
-- input, identical answer). It can never resurrect quota: the consume
-- happens first, and an exhausted identity is blocked before the lookup.
-- (The WP3 reconciliation removed a PROPOSED fault-code cache because
-- legacy data carries no codes to key on; this cache keys on the new
-- WP5 request stream itself, which is grounded by construction.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnosis_cache (
  cache_key   text PRIMARY KEY,
  report      jsonb NOT NULL,             -- the /ai response shape, whole
  model       text NOT NULL,
  tier        text NOT NULL,
  hit_count   int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_hit_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Stripe webhook fix (owner rule, WP5): the legacy webhook updated ONLY
-- the User collection, so a SHOP's business-plan payment could never be
-- recorded (payments.js findByIdAndUpdate against the wrong model).
-- Shops therefore gain the two columns the webhook needs — this is the
-- one deliberate exception to 0005's "shops carry no Stripe fields"
-- note, ordered explicitly by the owner for WP5. Towing companies
-- already carry `plan` (0005); they gain a customer column for symmetry.
-- ---------------------------------------------------------------------------
ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE INDEX IF NOT EXISTS shops_stripe_customer_idx ON shops (stripe_customer_id);

ALTER TABLE towing_companies ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE INDEX IF NOT EXISTS towing_stripe_customer_idx ON towing_companies (stripe_customer_id);
