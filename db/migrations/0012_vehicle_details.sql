-- ---------------------------------------------------------------------------
-- 0012 — Vehicle detail fields (owner spec, Nov 3 2026)
--
-- The owner's add-a-vehicle spec: REQUIRED — year, make, model,
-- engine/cylinders, current mileage. OPTIONAL — trim, VIN, color,
-- license plate. Trim + VIN landed in 0009; mileage exists from 0003
-- (nullable — the legacy model allowed it empty). This migration adds
-- the three fields the spec needs that the table does not have:
--
--   engine         free text ("2.0L 4-cylinder", "3.5L V6") — the same
--                  shape listings already carry (0006) and the NHTSA
--                  vPIC decode returns, so a VIN lookup can prefill it
--   color          optional
--   license_plate  optional
--
-- All three are NULLABLE at the database level on purpose: converted
-- legacy rows (ETL) and quick VIN captures may not know them yet. The
-- REQUIRED rule for new vehicles is enforced at the service layer
-- (vehicleService.createVehicle) — the form mirrors it — so an old row
-- is never made invalid retroactively.
-- ---------------------------------------------------------------------------

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_plate text;
