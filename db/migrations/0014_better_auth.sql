-- 0014_better_auth.sql — Better Auth tables (AUTH DECISION 2026-11-06)
-- Better Auth becomes the customer sign-in engine (Google one-tap +
-- email/password). Its USER model is the existing `users` table
-- (config maps emailVerified->is_verified, image->avatar,
-- createdAt/updatedAt->created_at/updated_at; `phone` rides as an
-- additional field) — this migration adds only the three tables
-- Better Auth owns outright, in the project's snake_case style:
--
--   ba_account      one row per sign-in method per user. Google rows
--                   carry provider_id='google', account_id=<Google
--                   sub>; credential rows carry provider_id=
--                   'credential', account_id=<user id>, password=
--                   the bcrypt hash (the app's bcryptjs is plugged
--                   into Better Auth, so hashes are interchangeable
--                   with users.password_hash).
--   ba_session      Better Auth cookie sessions.
--   ba_verification short-lived verification rows (email verify etc).
--
-- The credential BACKFILL below copies every existing
-- users.password_hash into a credential account row, so every
-- customer who has a password today can sign in through Better Auth
-- with that same password the moment the cutover flips — nobody is
-- forced through a reset. Google-only legacy users (password_hash
-- NULL) get no credential row; they sign in with Google and Better
-- Auth links them to this same users row by verified email.

CREATE TABLE IF NOT EXISTS ba_account (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id              text NOT NULL,
  provider_id             text NOT NULL,
  access_token            text,
  refresh_token           text,
  id_token                text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope                   text,
  password                text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, account_id)
);
CREATE INDEX IF NOT EXISTS ba_account_user_idx ON ba_account (user_id);

CREATE TABLE IF NOT EXISTS ba_session (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ba_session_user_idx ON ba_session (user_id);

CREATE TABLE IF NOT EXISTS ba_verification (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  text NOT NULL,
  value       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ba_verification_identifier_idx ON ba_verification (identifier);

-- Credential backfill (idempotent): one credential account row per
-- user who already has a password hash.
INSERT INTO ba_account (user_id, account_id, provider_id, password, created_at, updated_at)
SELECT id, id::text, 'credential', password_hash, created_at, now()
  FROM users
 WHERE password_hash IS NOT NULL
ON CONFLICT (provider_id, account_id) DO NOTHING;
