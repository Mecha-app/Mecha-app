-- 0020_shops_trial.sql — the Shops free trial (owner decision,
-- 2026-11-19, final spec via the Chief of Staff): a shop gets
-- 14 DAYS free AND 25 free diagnosis credits, no card to start.
-- The trial ends at whichever comes first — the 14 days elapse or
-- the 25 trial credits are used — and then the Shops plan
-- ($149/month, 500-credit monthly bucket, migration 0019) is the
-- way back in, through the existing Stripe checkout + webhook.
--
-- The trial window lives ON the shop record (trial_started_at /
-- trial_ends_at), set at registration (lib/server/businessService.ts
-- via the store's createShop). Trial expiry is always computed from
-- trial_ends_at — never from session state. The 25 trial credits
-- ARE the shop free allowance: shops.free_diagnoses_used (0019)
-- counts against the new limit in lib/server/pricing.ts
-- (SHOP_TRIAL_CREDITS = 25, superseding the old 10-at-signup).
--
-- Existing shops (pre-launch; shop outreach has not run yet) get a
-- fresh window starting at migration time rather than one backdated
-- to created_at, so no early signup loses free diagnoses it was
-- promised under the old model. Subscribed shops (plan='business')
-- keep the settled free-first consumption order regardless.
--
-- Shop-run diagnoses also become saveable records: diagnostics
-- gains a nullable shop_id and user_id becomes nullable (a row is
-- owned by a driver OR a shop — the shop diagnosis path in
-- lib/server/diagnoseService.ts saves with shop_id set).
--
-- APPLY BEFORE the code that reads these columns serves traffic:
-- lib/server/store.ts selects them on every shop read.

ALTER TABLE shops ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

UPDATE shops
   SET trial_started_at = now(),
       trial_ends_at = now() + interval '14 days'
 WHERE trial_started_at IS NULL;

ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES shops(id) ON DELETE CASCADE;
ALTER TABLE diagnostics ALTER COLUMN user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS diagnostics_shop_idx ON diagnostics (shop_id, created_at);

-- Subscription-checkout idempotency: one row per checkout session
-- whose activation has been applied. The webhook fills the monthly
-- bucket only when it records the session here first, so a replayed
-- checkout.session.completed can never reset a partially used
-- bucket (a second grant). The one-time diagnosis-credit path keeps
-- its own gate in credit_ledger (0019).
CREATE TABLE IF NOT EXISTS applied_checkout_sessions (
  stripe_session_id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
