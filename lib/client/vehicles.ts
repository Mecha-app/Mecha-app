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

/* ------------------------------------------------------------------ */
/* Pass 16 — VIN auto-fill: the decode → Add Vehicle form mapping.     */

/**
 * The slice of the VIN-decode enrichment the Add Vehicle flow fills
 * from — the server's VinDecode (lib/server/nhtsa), mirrored
 * client-side. Every field is nullable because vPIC is: a missing
 * value means NHTSA has no data for it, never a guess.
 */
export interface VinDecodeFill {
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  engineModel: string | null;
  displacementL: string | null;
  cylinders: string | null;
  engineConfiguration: string | null;
}

/** The Add Vehicle form values a decode fills ("" where vPIC has none). */
export interface VehicleFormFill {
  year: string;
  make: string;
  model: string;
  trim: string;
  engine: string;
}

/**
 * The engine line the form shows, in the owner's own format
 * ("3.5L V6", "2.0L 4-cylinder"): displacement, then the cylinder
 * layout vPIC reports, then the engine model code when vPIC names
 * one and it isn't already in the line. Falls back to the decoder's
 * composed engine string, then to "".
 */
export function composeEngineText(decode: VinDecodeFill): string {
  const parts: string[] = [];
  const displacement = decode.displacementL?.trim();
  if (displacement) parts.push(`${displacement}L`);
  const cylinders = Number.parseInt(decode.cylinders ?? "", 10);
  if (Number.isFinite(cylinders) && cylinders > 0) {
    const config = (decode.engineConfiguration ?? "").trim().toLowerCase();
    if (config.startsWith("v")) parts.push(`V${cylinders}`);
    else if (config.includes("rotary")) parts.push("rotary");
    else parts.push(`${cylinders}-cylinder`);
  }
  const model = decode.engineModel?.trim();
  if (model && !parts.some((part) => part.toLowerCase().includes(model.toLowerCase()))) {
    parts.push(model);
  }
  if (parts.length > 0) return parts.join(" ");
  return decode.engine?.trim() ?? "";
}

/** Decoded values → Add Vehicle form values. */
export function vehicleFormFillFromDecode(decode: VinDecodeFill): VehicleFormFill {
  return {
    year: decode.year?.trim() ?? "",
    make: decode.make?.trim() ?? "",
    model: decode.model?.trim() ?? "",
    trim: decode.trim?.trim() ?? "",
    engine: composeEngineText(decode),
  };
}
