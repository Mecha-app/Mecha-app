-- 0019_diagnosis_credits.sql — the credit model (Stripe pass, 2026-11-18).
--
-- OWNER'S SETTLED PRICING MODEL (Frantz, 2026-11-17/18 — binding):
--   * Drivers: 5 FREE diagnoses at signup, LIFETIME (users.free_diagnoses_used,
--     migration 0008 — unchanged). Then TWO paid doors:
--       - Pro: $9.99/month = 100 diagnosis credits per month (a monthly
--         bucket that resets each cycle, NO rollover), or
--       - a single purchased diagnosis credit ($4.00 default, configurable —
--         lib/server/pricing.ts), which never expires.
--   * Shops: 10 FREE diagnoses at signup, then $149/month including a
--     500-credit monthly bucket.
--   * 1 diagnosis = 1 credit everywhere. Nothing is "unlimited".
--   * Consumption order (drivers): free lifetime first, then the monthly
--     bucket (it expires), then purchased single credits. Shops: free
--     first, then the monthly bucket.
--
-- APPLY BEFORE the code that reads these columns serves traffic:
-- lib/server/store.ts selects them on every user/shop read.

-- Purchased single-diagnosis credits (drivers). Never expires; only ever
-- decremented by a diagnosis run, only ever incremented by a verified
-- Stripe webhook grant (see credit_ledger).
ALTER TABLE users ADD COLUMN IF NOT EXISTS diagnosis_credits int NOT NULL DEFAULT 0;

-- The monthly bucket (drivers on Pro; the counter lives on the user row,
-- the limit comes from the plan — lib/server/pricing.ts). monthly_period_start
-- anchors the current bucket window; when a consume finds the window a full
-- month old, the counter resets lazily (see lib/server/credits.ts). Stripe
-- subscription events also reset it on activation/renewal.
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_diagnoses_used int NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_period_start timestamptz;

-- Shops: their own free allowance (10 at signup — the limit lives in
-- lib/server/pricing.ts) and their own monthly bucket counter (500/month
-- on the business plan).
ALTER TABLE shops ADD COLUMN IF NOT EXISTS free_diagnoses_used int NOT NULL DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS monthly_diagnoses_used int NOT NULL DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS monthly_period_start timestamptz;

-- The audit ledger for purchased single credits. Every grant and every
-- consumption is one row, so a balance can always be reconciled against
-- Stripe. stripe_session_id is UNIQUE: a replayed checkout.session.completed
-- webhook can never grant twice (the grant insert is ON CONFLICT DO NOTHING
-- and the balance moves only when the row lands).
CREATE TABLE IF NOT EXISTS credit_ledger (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('grant', 'consume')),
  amount            int NOT NULL,
  source            text NOT NULL,
  stripe_session_id text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_session_idx
  ON credit_ledger (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS credit_ledger_user_idx
  ON credit_ledger (user_id, created_at);
