-- 0016_diagnosis_vehicle_link.sql — a diagnosis belongs to the ACCOUNT,
-- and to a vehicle only when the run names one (Pass 15, 2026-11-16).
--
-- Before this migration, diagnostics.vehicle_id was NOT NULL and the
-- diagnosis service only saved a record when the request carried a
-- vehicleId — but no form ever sent one (the diagnose form asked for a
-- free-text "Year, make, and model" string and nothing else). Every
-- real diagnosis therefore ran, consumed quota, and was NEVER saved:
-- the Health Vault showed "No diagnoses saved for this vehicle yet"
-- for vehicles the owner had diagnosed repeatedly, and the dashboard's
-- recent list missed the same runs.
--
-- The fix, in three parts:
--   1. vehicle_id becomes NULLABLE — a saved diagnosis may be unlinked
--      (free-text run) instead of unsaved. The FK stays: a linked
--      diagnosis still names a real vehicle, and deleting the vehicle
--      still cascades its linked history.
--   2. vehicle_info stores the exact vehicle string the run used —
--      the saved vehicle's composed "year make model trim (engine)"
--      when picked, or the driver's typed text otherwise. The Vault
--      matches unlinked records to a vehicle by this string at read
--      time (year + make + model, case-insensitive), so runs saved
--      without an id still land under the right car. No backfill:
--      rows saved before this migration have neither problem (they
--      all carry a vehicle_id — the old code saved nothing else).
--   3. An index for the Vault's unlinked-by-owner read.

ALTER TABLE diagnostics ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS vehicle_info text;
CREATE INDEX IF NOT EXISTS diagnostics_user_unlinked_idx
  ON diagnostics (user_id, created_at DESC) WHERE vehicle_id IS NULL;
