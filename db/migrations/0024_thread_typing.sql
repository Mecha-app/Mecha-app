-- 0024 — Thread typing state (owner order, 2026-11-20).
--
-- Live chat inside Messages: while a person types in an open
-- thread, the other side sees a "typing…" indicator. The signal is
-- a heartbeat row per (driver, shop, side): the client re-pings
-- every few seconds while the composer holds unsent text, each
-- ping pushing expires_at a few seconds out; the other side's
-- thread poll reads the row and shows the indicator only while
-- expires_at is in the future. No row (or an expired one) = not
-- typing. Stale rows are harmless — they read as "not typing" and
-- are overwritten by the next ping; no cleanup job is needed.
--
-- The code degrades honestly without this table: the Pg store's
-- typing reads/writes fail soft (typing simply never lights up),
-- and the rest of messaging is untouched — so this migration can
-- be applied after the code deploy, same pattern as 0021–0023.
--
-- Apply in the Supabase SQL Editor (project mecha-production).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS thread_typing (
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id      uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sender_type  text NOT NULL CHECK (sender_type IN ('user', 'shop')),
  expires_at   timestamptz NOT NULL,
  PRIMARY KEY (from_user_id, shop_id, sender_type)
);
