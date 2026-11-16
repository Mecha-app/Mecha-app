-- 0007_new_feature_tables.sql — WP5-NEW tables (NO legacy source)
-- These two Health Vault tables come from the owner-approved blueprint
-- (maintenance schedule, receipt-photo logging) — the repo has NO
-- service-record or reminder model, so NOTHING converts into them; they
-- start empty at cutover and fill with new data from the WP5 build.
-- They live in their own file so the conversion schema (0001–0006) stays
-- an honest mirror of the repo.
--
-- (This file replaces an earlier 0007 that modeled a `subscriptions`
-- table. The repo stores NO subscription records: the Stripe webhook
-- writes only users.plan + users.stripe_customer_id — see 0002. The
-- invented table was removed in the 2026-11-03 reconciliation.)

CREATE TABLE IF NOT EXISTS service_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id    text UNIQUE,                          -- always NULL (no legacy source)
  vehicle_id   uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_date date,
  type         text,                                 -- oil, brakes, tires, inspection, ...
  description  text,
  cost         numeric(10,2),
  shop_name    text,                                 -- free text: not all service is at platform shops
  receipt_url  text,                                 -- receipt photo (external path/URL)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_records_vehicle_idx ON service_records (vehicle_id);

DROP TRIGGER IF EXISTS service_records_set_updated_at ON service_records;
CREATE TRIGGER service_records_set_updated_at BEFORE UPDATE ON service_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id    text UNIQUE,                          -- always NULL (no legacy source)
  vehicle_id   uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type         text NOT NULL,                        -- maintenance, registration, inspection, recall
  due_date     date,
  due_mileage  int,
  status       reminder_status NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_reminders_vehicle_idx ON maintenance_reminders (vehicle_id);
CREATE INDEX IF NOT EXISTS maintenance_reminders_due_idx ON maintenance_reminders (due_date)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS maintenance_reminders_set_updated_at ON maintenance_reminders;
CREATE TRIGGER maintenance_reminders_set_updated_at BEFORE UPDATE ON maintenance_reminders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
