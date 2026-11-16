-- 0009_wp6_product.sql — WP6: vault identity fields, listing ZIP + nearby,
-- two-way shop messaging threads.
-- Grounding notes:
--   * vehicles (0003) deliberately had NO trim/VIN: the repo model has
--     none. The WP6 Scan/Vault flows introduce them as NEW data (the 0003
--     header already anticipated VIN arriving with the Scan flow), so they
--     land here as plain nullable columns — ETL rows simply stay NULL.
--   * listings (0006) had NO zip: the repo model has none. WP6's public
--     marketplace search is ZIP-based (owner's nearby spec), so listings
--     gain a nullable zip; city/state remain the required location fields.
--     Listing photos stay the 0006 `images` JSONB — WP6 stores guided
--     photo objects there ({url, slot}), see lib/server/listingService.ts.
--   * shop_messages (0006) mirror the repo Message model: driver -> shop,
--     one direction, no sender column. WP6 builds a two-way threaded
--     conversation view on the SAME table (the thread is the
--     (from_user_id, shop_id) pair); shop replies need to say who sent
--     them, so the table gains sender_type + from_shop_id. Legacy rows
--     default to sender_type 'user' — exactly what they were.

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS trim text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin text;
CREATE INDEX IF NOT EXISTS vehicles_vin_idx ON vehicles (upper(vin));

ALTER TABLE listings ADD COLUMN IF NOT EXISTS zip text;
CREATE INDEX IF NOT EXISTS listings_zip_idx ON listings (zip);

ALTER TABLE shop_messages
  ADD COLUMN IF NOT EXISTS sender_type text NOT NULL DEFAULT 'user'
    CHECK (sender_type IN ('user', 'shop'));
ALTER TABLE shop_messages
  ADD COLUMN IF NOT EXISTS from_shop_id uuid REFERENCES shops(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS shop_messages_thread_idx
  ON shop_messages (from_user_id, shop_id, created_at);
