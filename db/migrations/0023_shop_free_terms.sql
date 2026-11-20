-- 0023 — Shop free terms (owner decision, 2026-11-20).
--
-- The shops free tier changes from "14 days + 25 diagnoses" to a
-- count-only shelf: 20 free diagnoses per business, no day limit,
-- then the $149/mo subscription. Businesses that registered under
-- the printed 14-day / 25-diagnosis promise KEEP those terms —
-- the grandfather line is this migration:
--
--   * every business row that EXISTS when this runs is stamped
--     'legacy' and keeps 14 days + 25 diagnoses;
--   * every row created AFTER gets 'free20' (20 diagnoses, no day
--     limit) from the column default.
--
-- Code reads the column through a to_jsonb expression (the 0021
-- pattern), so it runs before and after this migration: a missing
-- column reads as NULL, which the app treats as 'legacy' — the
-- more generous terms — so nobody is shortchanged in the gap
-- between the code deploy and this migration.
--
-- Apply in the Supabase SQL Editor (project mecha-production),
-- same pattern as 0021/0022. Idempotent: safe to re-run.

ALTER TABLE shops ADD COLUMN IF NOT EXISTS free_terms text;
ALTER TABLE towing_companies ADD COLUMN IF NOT EXISTS free_terms text;

UPDATE shops SET free_terms = 'legacy' WHERE free_terms IS NULL;
UPDATE towing_companies SET free_terms = 'legacy' WHERE free_terms IS NULL;

ALTER TABLE shops ALTER COLUMN free_terms SET DEFAULT 'free20';
ALTER TABLE towing_companies ALTER COLUMN free_terms SET DEFAULT 'free20';

ALTER TABLE shops ALTER COLUMN free_terms SET NOT NULL;
ALTER TABLE towing_companies ALTER COLUMN free_terms SET NOT NULL;

-- =====================================================================
-- PART 2 — SEPARATE STEP: the OWNER'S OWN TEST SHOP goes on the NEW
-- terms. Run this AFTER Part 1 above, in the same sitting.
--
-- Why: production's only registered business is the owner's own test
-- shop, registered today (2026-11-20) while he was testing the shop
-- flow. Part 1 stamps every existing row 'legacy' — correct for any
-- real shop that signed up under the printed 14-day / 25 promise,
-- but the owner's own test shop should show him the NEW counter
-- ("X of 20 free diagnoses left") when he tests, so this one row is
-- moved to 'free20' explicitly.
--
-- STEP 1 — run this SELECT first and confirm it returns exactly the
-- owner's test shop (one row):
--
--   SELECT id, shop_name, email, created_at, free_terms
--     FROM shops
--    WHERE created_at >= '2026-11-20' AND created_at < '2026-11-21';
--
-- STEP 2 — then run this UPDATE:
-- =====================================================================

UPDATE shops
   SET free_terms = 'free20'
 WHERE created_at >= '2026-11-20' AND created_at < '2026-11-21';

-- If the Step-1 SELECT ever showed MORE THAN ONE row from
-- 2026-11-20, do NOT run the UPDATE above — run this variant
-- instead, which targets the owner's own account email:
--
--   UPDATE shops
--      SET free_terms = 'free20'
--    WHERE email = 'app.mechaai@gmail.com'
--      AND created_at >= '2026-11-20' AND created_at < '2026-11-21';
