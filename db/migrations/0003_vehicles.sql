-- 0003_vehicles.sql — driver vehicles (Health Vault identity rows)
-- GROUNDED in repo backend/src/models/Vehicle.js (2026-11-03):
--   owner (User ref, required), year (STRING, required), make (STRING,
--   required), model (STRING, required), mileage (Number), nickname,
--   createdAt. The plan assumed trim / VIN / photo columns — the repo has
--   NONE of them, so neither does this table (VIN arrives with the WP5
--   Scan flow as new data, not conversion).
--   The model's diagnoses ObjectId array is a denormalized back-reference:
--   NOT a column — diagnostics.vehicle_id is the single source of truth.

CREATE TABLE IF NOT EXISTS vehicles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   text UNIQUE,
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year        text NOT NULL,                        -- legacy stores year as a string
  make        text NOT NULL,
  model       text NOT NULL,
  mileage     int,
  nickname    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicles_owner_idx ON vehicles (owner_id);

DROP TRIGGER IF EXISTS vehicles_set_updated_at ON vehicles;
CREATE TRIGGER vehicles_set_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
