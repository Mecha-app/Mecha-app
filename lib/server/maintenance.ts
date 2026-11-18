/**
 * Maintenance reminders (Pass #20 — the FIXD lesson: diagnosis is a
 * rare event; maintenance is the reason a driver opens the app every
 * month). Pure computation, no I/O.
 *
 * HONESTY RULES: MECHA has no telemetry from the car. A reminder can
 * only be computed from what the driver themselves entered — the
 * vehicle's odometer reading and the "last done" marks they record —
 * and the UI labels it exactly that way. Intervals below are the
 * widely published *typical* ranges for each job; every surface that
 * shows them also says to check the owner's manual, because the
 * manufacturer's schedule for the specific car wins.
 */

export interface MaintenanceItemDef {
  key: string;
  label: string;
  intervalMiles: number;
  intervalMonths: number;
}

export const MAINTENANCE_ITEMS: MaintenanceItemDef[] = [
  { key: "oil", label: "Oil change", intervalMiles: 5000, intervalMonths: 6 },
  { key: "tireRotation", label: "Tire rotation", intervalMiles: 7500, intervalMonths: 6 },
  { key: "brakeInspection", label: "Brake inspection", intervalMiles: 12000, intervalMonths: 12 },
  { key: "coolant", label: "Coolant service", intervalMiles: 30000, intervalMonths: 24 },
  { key: "transmission", label: "Transmission service", intervalMiles: 60000, intervalMonths: 48 },
];

export function maintenanceItem(key: string): MaintenanceItemDef | null {
  return MAINTENANCE_ITEMS.find((item) => item.key === key) ?? null;
}

export interface ServiceMarkLike {
  item: string;
  lastMileage: number | null;
  /** ISO date (yyyy-mm-dd) the job was last done, as the driver entered it. */
  lastDate: string | null;
}

export type MaintenanceStatus = "due" | "soon" | "ok" | "unknown";

export interface MaintenanceState {
  item: MaintenanceItemDef;
  status: MaintenanceStatus;
  /** Miles until due (negative = overdue), when computable. */
  milesLeft: number | null;
  /** Whole days until due (negative = overdue), when computable. */
  daysLeft: number | null;
  mark: ServiceMarkLike | null;
}

const DAY_MS = 86_400_000;

function addMonths(isoDate: string, months: number): number | null {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.getTime();
}

/**
 * One item's state for one vehicle. "unknown" is the honest answer
 * when the driver has never told MECHA when the job was last done —
 * the reminder invites the entry instead of guessing from the car's
 * total mileage (a 120,000-mile car may have had its oil done last
 * week; MECHA doesn't know, and says so).
 */
export function maintenanceState(
  def: MaintenanceItemDef,
  currentMileage: number | null,
  mark: ServiceMarkLike | null,
  now: Date,
): MaintenanceState {
  if (!mark || (mark.lastMileage === null && !mark.lastDate)) {
    return { item: def, status: "unknown", milesLeft: null, daysLeft: null, mark: mark ?? null };
  }
  const milesLeft =
    mark.lastMileage !== null && currentMileage !== null
      ? mark.lastMileage + def.intervalMiles - currentMileage
      : null;
  let daysLeft: number | null = null;
  if (mark.lastDate) {
    const dueAt = addMonths(mark.lastDate, def.intervalMonths);
    if (dueAt !== null) daysLeft = Math.round((dueAt - now.getTime()) / DAY_MS);
  }
  const due = (milesLeft !== null && milesLeft <= 0) || (daysLeft !== null && daysLeft <= 0);
  const soon =
    !due &&
    ((milesLeft !== null && milesLeft <= 1000) || (daysLeft !== null && daysLeft <= 30));
  return {
    item: def,
    status: due ? "due" : soon ? "soon" : "ok",
    milesLeft,
    daysLeft,
    mark,
  };
}

export function maintenanceStates(
  currentMileage: number | null,
  marks: ServiceMarkLike[],
  now: Date,
): MaintenanceState[] {
  const byItem = new Map(marks.map((m) => [m.item, m]));
  return MAINTENANCE_ITEMS.map((def) =>
    maintenanceState(def, currentMileage, byItem.get(def.key) ?? null, now),
  );
}
