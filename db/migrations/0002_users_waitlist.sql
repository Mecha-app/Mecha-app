-- 0002_users_waitlist.sql — driver accounts + the new email-only waitlist
-- GROUNDED in repo backend/src/models/User.js + routes (2026-11-03):
--   schema fields: name (required), email (required, unique, lowercase),
--   password (bcryptjs cost 12), googleId (unique, sparse), avatar,
--   authMethod ('email'|'google'|'both', default 'email'), phone,
--   resetToken, resetExpires, createdAt. NO updatedAt in legacy.
--   RUNTIME fields the routes depend on but the Mongoose schema OMITS
--   (diagnoses.js check-limit, payments.js webhook, admin.js stats):
--   plan ('free'|'pro'), stripeCustomerId, diagnosisCount,
--   diagnosisResetDate, isVerified. Under Mongoose strict mode those writes
--   are stripped, so stored documents may LACK them — the ETL defaults
--   plan='free', diagnosis_count=0, stripe_customer_id=NULL.
--   The users.vehicles ObjectId array is a denormalized back-reference:
--   NOT a column here — vehicles.owner_id is the single source of truth.
-- The landing page's legacy "waitlist" was a client-side fake (setJoined
-- with no request — LandingPage.js) and its CTAs route to /register:
-- NO legacy waitlist data exists anywhere. waitlist_signups below is a
-- NEW redesign table (zero rows convert).

CREATE TABLE IF NOT EXISTS users (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id              text UNIQUE,               -- Mongo ObjectId string
  name                   text NOT NULL,
  email                  text NOT NULL,
  password_hash          text,                      -- bcryptjs, carried as-is; NULL for Google-only accounts
  google_sub             text UNIQUE,               -- repo field: googleId (sparse unique)
  avatar                 text,
  auth_method            text NOT NULL DEFAULT 'email'
                           CHECK (auth_method IN ('email', 'google', 'both')),
  phone                  text,
  is_verified            boolean NOT NULL DEFAULT false,  -- runtime field (google/verify create)
  plan                   plan_tier NOT NULL DEFAULT 'free', -- runtime field (webhook/check-limit)
  stripe_customer_id     text,                      -- runtime field (webhook: session.customer)
  diagnosis_count        int NOT NULL DEFAULT 0,    -- runtime field (monthly counter)
  diagnosis_reset_date   timestamptz,               -- runtime field (monthly reset anchor)
  reset_token            text,                      -- password-reset JWT (1h) while pending
  reset_expires          timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_stripe_customer_idx ON users (stripe_customer_id);

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Email-only waitlist (NEW in the redesign; NOT converted legacy data).
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   text UNIQUE,                          -- always NULL for new signups; kept for uniformity
  email       text NOT NULL,
  source      text NOT NULL DEFAULT 'homepage',     -- which surface captured it
  locale      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_lower_idx
  ON waitlist_signups (lower(email));
