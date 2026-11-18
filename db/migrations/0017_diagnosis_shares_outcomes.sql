-- 0017_diagnosis_shares_outcomes.sql — shareable report cards +
-- outcome capture (Pass 20, 2026-11-17).
--
-- SHARES: a driver can mint ONE public link per diagnosis. The link
-- carries an unguessable token (192 bits, generated in the store);
-- the public page behind it renders only the report summary the
-- driver chose to share — vehicle line, verdict, summary, fair-price
-- range, likely part names — never the account, the email, or any
-- other diagnosis. Deleting the diagnosis deletes the link.
--
-- OUTCOMES: the seed of MECHA's own verified-fix dataset (the CarMD
-- lesson). After a diagnosis, the driver may record what actually
-- fixed the car and what it cost. One outcome per diagnosis, stored
-- against the diagnosis (and through it, the vehicle + account).
-- Nothing here is ever shown publicly; it exists so MECHA's future
-- answers can be grounded in real repairs instead of estimates.

CREATE TABLE IF NOT EXISTS diagnosis_shares (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid NOT NULL UNIQUE REFERENCES diagnostics(id) ON DELETE CASCADE,
  token        text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diagnosis_shares_token_idx ON diagnosis_shares (token);

CREATE TABLE IF NOT EXISTS diagnosis_outcomes (
  diagnosis_id uuid PRIMARY KEY REFERENCES diagnostics(id) ON DELETE CASCADE,
  what_fixed   text NOT NULL,
  cost_usd     integer,
  -- Optional 1–5 star rating of the diagnosis, plus the driver's
  -- explicit permission to quote their words as a review (the
  -- honest feeder for future review surfaces: real words, real
  -- permission, or nothing is ever shown).
  rating     smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  quote_permission boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
