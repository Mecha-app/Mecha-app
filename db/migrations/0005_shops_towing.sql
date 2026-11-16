-- 0005_shops_towing.sql — shops + towing companies (both are auth actors)
-- GROUNDED in repo backend/src/models/Shop.js + Towing.js (2026-11-03):
-- SHOPS: shopName (required), ownerName, email (unique, lowercase),
--   password (bcryptjs 12), googleId (sparse unique), authMethod,
--   phone (REQUIRED), address, city, state, zip (REQUIRED),
--   location = GeoJSON Point with a 2dsphere index (coordinates [lng,lat],
--   DEFAULT [0,0] — the ETL maps [0,0] to NULL lat/lng = location unset),
--   about, specialties [String], languages [String], hours (a free-text
--   STRING in the repo — not a structured object), rating (Number,
--   default 0), reviewCount (default 0), isVerified, isActive (default
--   true), views, leads (plain counters), createdAt.
--   There is NO reviews collection in the repo — rating/review_count are
--   counters on the shop row, so there is deliberately NO shop_reviews
--   table and NO recompute trigger (an earlier draft invented both;
--   removed in this reconciliation). Reviews are a WP5 new feature.
--   Shops carry NO Stripe fields in the repo.
-- TOWING: companyName (required), ownerName, email, password, googleId,
--   authMethod, phone (REQUIRED), zip, location Point (same [0,0] rule),
--   serviceRadius (MILES, default 25), truckCount (default 1),
--   plan (string, default 'starter' — towing's own plan names),
--   monthlyJobs, totalRevenue, rating, isVerified, isActive, createdAt.
--   The plan assumed a coverage JSONB — the repo uses point + radius.

CREATE TABLE IF NOT EXISTS shops (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id     text UNIQUE,
  shop_name     text NOT NULL,
  owner_name    text,
  email         text NOT NULL,
  password_hash text,                                -- bcryptjs, carried as-is
  google_sub    text UNIQUE,                         -- repo field: googleId
  auth_method   text NOT NULL DEFAULT 'email'
                  CHECK (auth_method IN ('email', 'google', 'both')),
  phone         text NOT NULL,
  address       text,
  city          text,
  state         text,
  zip           text NOT NULL,
  lat           numeric(9,6),                        -- from location.coordinates[1]; NULL when legacy [0,0]
  lng           numeric(9,6),                        -- from location.coordinates[0]; NULL when legacy [0,0]
  about         text,
  specialties   jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [String] in the repo
  languages     jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [String]; register defaults ['EN']
  hours         text,                                -- free-text string in the repo
  rating        numeric(3,2) NOT NULL DEFAULT 0,     -- plain counter value, as stored
  review_count  int NOT NULL DEFAULT 0,              -- plain counter, as stored
  is_verified   boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  views         int NOT NULL DEFAULT 0,
  leads         int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS shops_email_lower_idx ON shops (lower(email));
CREATE INDEX IF NOT EXISTS shops_zip_idx ON shops (zip);
CREATE INDEX IF NOT EXISTS shops_geo_idx ON shops (lat, lng);

DROP TRIGGER IF EXISTS shops_set_updated_at ON shops;
CREATE TRIGGER shops_set_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS towing_companies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id         text UNIQUE,
  company_name      text NOT NULL,
  owner_name        text,
  email             text NOT NULL,
  password_hash     text,                            -- bcryptjs, carried as-is
  google_sub        text UNIQUE,                     -- repo field: googleId
  auth_method       text NOT NULL DEFAULT 'email'
                      CHECK (auth_method IN ('email', 'google', 'both')),
  phone             text NOT NULL,
  zip               text,
  lat               numeric(9,6),                    -- NULL when legacy location is [0,0]
  lng               numeric(9,6),
  service_radius_mi int NOT NULL DEFAULT 25,         -- repo: serviceRadius, miles
  truck_count       int NOT NULL DEFAULT 1,
  plan              text NOT NULL DEFAULT 'starter',
  monthly_jobs      int NOT NULL DEFAULT 0,
  total_revenue     numeric(10,2) NOT NULL DEFAULT 0,
  rating            numeric(3,2) NOT NULL DEFAULT 0,
  is_verified       boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS towing_email_lower_idx ON towing_companies (lower(email));
CREATE INDEX IF NOT EXISTS towing_geo_idx ON towing_companies (lat, lng);

DROP TRIGGER IF EXISTS towing_set_updated_at ON towing_companies;
CREATE TRIGGER towing_set_updated_at BEFORE UPDATE ON towing_companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
