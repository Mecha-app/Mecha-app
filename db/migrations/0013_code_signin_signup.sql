-- ---------------------------------------------------------------------------
-- 0013 — Code-first sign-up + code sign-in (owner spec, Nov 3 2026)
--
-- The owner ordered sign-up and login made EASY, "just like the big
-- brand": one email door. A visitor types an email and gets a 6-digit
-- code; if the email already has an account the code signs them IN,
-- if it doesn't, the code starts the sign-up and the account is
-- created already email-verified. Phone is OPTIONAL at sign-up (the
-- diagnosis phone gate in the app layer still requires email AND
-- phone on file before any diagnosis is consumed).
--
-- Two additions:
--
--   auth_codes purpose 'signin'   the code-login purpose for EXISTING
--                                 accounts — same table, same hash /
--                                 TTL / attempt / single-use discipline
--                                 as 'verify_email' and 'reset_password'.
--
--   pending_signup_codes          the pre-account twin: a signup code
--                                 cannot hang off a user row (there is
--                                 no user yet, and auth_codes.user_id
--                                 is a FK), so the pending code is
--                                 keyed by the NORMALIZED EMAIL — the
--                                 identity key the account will be
--                                 created under. Only the SHA-256 hash
--                                 of (pending subject + purpose + code)
--                                 is stored; 15 minutes, at most 5
--                                 attempts, single-use, replaced by a
--                                 fresh issue.
--
-- There is still deliberately NO SMS delivery anywhere: codes travel
-- by EMAIL only (no SMS provider exists in the stack — a phone number
-- is an identity field, never a code channel).
-- ---------------------------------------------------------------------------

ALTER TABLE auth_codes DROP CONSTRAINT IF EXISTS auth_codes_purpose_check;
ALTER TABLE auth_codes ADD CONSTRAINT auth_codes_purpose_check
  CHECK (purpose IN ('verify_email', 'reset_password', 'signin'));

CREATE TABLE IF NOT EXISTS pending_signup_codes (
  email      text PRIMARY KEY,
  code_hash  text NOT NULL,
  attempts   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
