-- 0022_shop_reviews.sql — REAL per-shop customer reviews (owner order
-- 2026-11-20: "customers can leave a review for a shop on its profile
-- page").
--
-- Until now shops.rating / review_count were bare counters with no
-- reviews behind them (see 0005's note). This table is the real
-- thing: one row per (shop, driver account), written only by a
-- signed-in driver through POST /api/shops/<id>/reviews — never
-- seeded, never imported. A second submission from the same account
-- UPDATES the row (editing your own review). On every write the
-- store recomputes shops.rating (average, 2dp) and shops.review_count
-- from this table, so the nearby list and the profile page always
-- show numbers that come from these rows.
--
-- This is a different system from the homepage SAMPLE reviews
-- (REVIEWS_ARE_SAMPLES) — those are labeled samples on the marketing
-- page; these are per-shop and real.
--
-- Reads tolerate this migration not being applied yet (the store
-- answers an empty review list on undefined-table); writes fail
-- honestly until it runs.

CREATE TABLE IF NOT EXISTS shop_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating      int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body        text NOT NULL,
  -- The review's photos: ids into the 0015 uploads table (the
  -- reviewer uploads real files through the app's upload service —
  -- never URLs), at most 3, enforced in the review service.
  photo_ids   jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);

CREATE INDEX IF NOT EXISTS shop_reviews_shop_idx
  ON shop_reviews (shop_id, created_at DESC);

DROP TRIGGER IF EXISTS shop_reviews_set_updated_at ON shop_reviews;
CREATE TRIGGER shop_reviews_set_updated_at BEFORE UPDATE ON shop_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
