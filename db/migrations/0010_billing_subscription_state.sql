-- ---------------------------------------------------------------------------
-- 0010 — Billing subscription state (owner spec, Nov 3 2026)
--
-- The owner requires: pay with Apple Pay / Google Pay at checkout, and
-- cancel anytime from inside the account (Stripe Billing Portal). The
-- portal handles the mechanics, but the account screens must also STATE
-- the subscription truth in plain words — plan, status, and the current
-- period's end date ("renews on …" / "ends on …"). Until now the webhook
-- persisted only `plan` + `stripe_customer_id` (the legacy repo shape —
-- 0002's note "NO subscription columns" was repo truth for WP3); the
-- subscription lifecycle events (customer.subscription.*) had nowhere
-- to land. This migration gives all three billing actors the same four
-- columns the webhook now writes:
--
--   stripe_subscription_id     the subscription the plan rides on
--   subscription_status        Stripe's status verbatim (active,
--                              past_due, canceled, …); NULL = no
--                              subscription event seen yet
--   current_period_end         when the paid period ends (= renewal
--                              date while active)
--   cancel_at_period_end       the subscriber has cancelled and keeps
--                              access until current_period_end
--
-- Still NO subscriptions table and NO card data — Stripe remains the
-- billing system of record; these columns are the display cache the
-- account screens read.
-- ---------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS users_stripe_subscription_idx ON users (stripe_subscription_id);

ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS shops_stripe_subscription_idx ON shops (stripe_subscription_id);

ALTER TABLE towing_companies ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE towing_companies ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE towing_companies ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE towing_companies ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS towing_stripe_subscription_idx ON towing_companies (stripe_subscription_id);
