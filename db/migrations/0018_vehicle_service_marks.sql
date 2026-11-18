-- 0018_vehicle_service_marks.sql — maintenance reminder inputs
-- (Pass 20, 2026-11-17).
--
-- MECHA has no telemetry from the car, and the reminders never
-- pretend otherwise: a mark is the DRIVER's own record of when a job
-- was last done (odometer reading and/or date). Reminder state is
-- computed from these marks plus the vehicle's current mileage —
-- both user-entered — and labeled as such in the UI. One mark per
-- (vehicle, item); recording the job again replaces the mark.

CREATE TABLE IF NOT EXISTS vehicle_service_marks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  item         text NOT NULL,
  last_mileage integer,
  last_date    date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, item)
);
CREATE INDEX IF NOT EXISTS vehicle_service_marks_vehicle_idx
  ON vehicle_service_marks (vehicle_id);
