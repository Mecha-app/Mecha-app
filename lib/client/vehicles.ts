/**
 * Saved-vehicle display helpers (Pass 15) — the pure shapes behind
 * components/SavedVehicleField, kept dependency-free so the test
 * suite can pin them without a browser: the vehicle record the
 * garage API returns, the composed string a diagnosis run uses for
 * it, and the label the picker shows.
 */

export interface SavedVehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  trim: string | null;
  engine: string | null;
  nickname: string | null;
}

export const OTHER_VEHICLE_VALUE = "__other__";

/**
 * The vehicle string a diagnosis run uses for a saved vehicle —
 * mirrors buildVinVehicleInfo (lib/server/scan): "year make model
 * trim (engine)", each part only when present.
 */
export function savedVehicleInfo(vehicle: SavedVehicle): string {
  const head = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(" ");
  const engine = typeof vehicle.engine === "string" ? vehicle.engine.trim() : "";
  if (!head) return engine;
  return engine ? `${head} (${engine})` : head;
}

/** The picker's option label: the nickname leads when the driver set
 * one (the dashboard's convention), the identity always follows. */
export function savedVehicleLabel(vehicle: SavedVehicle): string {
  const identity = [vehicle.year, vehicle.make, vehicle.model]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ");
  return vehicle.nickname?.trim()
    ? `${vehicle.nickname.trim()} — ${identity}`
    : savedVehicleInfo(vehicle);
}
