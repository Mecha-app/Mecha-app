-- 0006_listings_messaging.sql — vehicle marketplace + BOTH legacy message types
-- GROUNDED in repo backend/src/models/Listing.js, ChatMessage.js,
-- Message.js + routes/listings.js, routes/shops.js (2026-11-03):
-- LISTINGS are standalone vehicle-for-sale ads — NOT linked to the
--   vehicles table in the repo. Fields: seller (User ref, required),
--   sellerName, sellerEmail (denormalized at creation), title (required),
--   year (STRING, required), make/model (required), trim, mileage
--   (Number, required), price (Number, required), titleStatus (default
--   'Clean Title'), condition (default 'Good'), color, transmission
--   (default 'Automatic'), drivetrain (default 'FWD'), engine,
--   description (required), knownProblems, phone, city/state (required),
--   images [String] of '/uploads/...' paths (creation requires >= 6),
--   status (plain string, default 'active'), views (default 0).
--   There is NO zip on listings in the repo.
-- MESSAGING is two flat collections, no conversation entity:
--   ChatMessage (marketplace): listingId (required), senderId -> User,
--     senderName, receiverId -> User, text (required), read (bool).
--   Message (driver -> shop contact, POST /api/shops/contact):
--     from -> User, fromEmail, toShop -> Shop, body (required), isRead.
--   The plan's conversations table + polymorphic sender design was
--   removed in this reconciliation — the tables below mirror the repo.

CREATE TABLE IF NOT EXISTS listings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id     text UNIQUE,
  seller_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_name   text,                                -- denormalized at creation in the repo
  seller_email  text,
  title         text NOT NULL,
  year          text NOT NULL,                       -- string in the repo
  make          text NOT NULL,
  model         text NOT NULL,
  trim          text,
  mileage       int NOT NULL,
  price         numeric(10,2) NOT NULL,
  title_status  text NOT NULL DEFAULT 'Clean Title',
  condition     text NOT NULL DEFAULT 'Good',
  color         text,
  transmission  text NOT NULL DEFAULT 'Automatic',
  drivetrain    text NOT NULL DEFAULT 'FWD',
  engine        text,
  description   text NOT NULL,
  known_problems text,
  phone         text,
  city          text NOT NULL,
  state         text NOT NULL,
  images        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [String] of '/uploads/...' paths
  status        text NOT NULL DEFAULT 'active',      -- plain string in the repo (queries filter 'active')
  views         int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings (seller_id);

DROP TRIGGER IF EXISTS listings_set_updated_at ON listings;
CREATE TRIGGER listings_set_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Marketplace chat (repo: ChatMessage) — flat, per listing, user <-> user.
CREATE TABLE IF NOT EXISTS listing_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   text UNIQUE,
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name text,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        text NOT NULL,
  read_at     timestamptz,                           -- repo: read boolean -> read_at set at ETL when true
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listing_messages_thread_idx
  ON listing_messages (listing_id, created_at);
CREATE INDEX IF NOT EXISTS listing_messages_parties_idx
  ON listing_messages (sender_id, receiver_id);

-- Driver -> shop contact messages (repo: Message).
CREATE TABLE IF NOT EXISTS shop_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   text UNIQUE,
  from_user_id uuid REFERENCES users(id) ON DELETE SET NULL,  -- repo: from (optional)
  from_email  text,
  shop_id     uuid REFERENCES shops(id) ON DELETE CASCADE,    -- repo: toShop
  body        text NOT NULL,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_messages_shop_idx ON shop_messages (shop_id, created_at DESC);
