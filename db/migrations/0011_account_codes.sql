-- ---------------------------------------------------------------------------
-- 0011 — Account verification + password reset codes (owner spec, Nov 3 2026)
--
-- The owner requires: after sign-up a customer can VERIFY their account
-- by email, and a customer who forgets their password can RESET it using
-- their phone number OR their email as the identifier.
--
-- Two additions:
--
--   users.email_verified_at    when the account's email was verified by
--                              code; NULL = not yet verified. (0002's
--                              legacy is_verified flag is also set true
--                              at the same moment, for ETL parity — it
--                              was a runtime field the legacy routes
--                              read; the timestamp is the rebuild's own
--                              record.)
--
--   auth_codes                 ONE live code per (user, purpose). The
--                              code itself is NEVER stored — only a
--                              SHA-256 hash of user-id + purpose + code.
--                              Codes live 15 minutes, allow at most 5
--                              attempts, and are deleted on use (single
--                              use) or when a fresh code replaces them.
--                              Purposes: 'verify_email', 'reset_password'.
--
-- There is deliberately NO SMS delivery anywhere in this design: reset
-- requests accept a phone number as the IDENTIFIER, but the code is
-- always delivered to the EMAIL ON FILE (no SMS provider exists). The
-- API/UI copy says exactly that.
-- ---------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS auth_codes (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    text NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  code_hash  text NOT NULL,
  attempts   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, purpose)
);
