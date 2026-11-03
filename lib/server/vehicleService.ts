import { ValidationError } from "./authService";
import { NotFoundError } from "./errors";
import type {
  AppStore,
  DiagnosisSummary,
  VehiclePatch,
  VehicleRecord,
} from "./appStore";

/**
 * Vehicle / Health Vault service (WP6) — validation + ownership for the
 * /api/vehicles routes, shared with the test-suite. Ownership rule:
 * a vehicle is only ever visible to its owner; every service call
 * carries the session user id and the store enforces it in the query.
 * A miss is a NotFoundError whether the vehicle is absent or someone
 * else's — the two are indistinguishable from outside.
 */

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function optionalString(value: unknown, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return cleanString(value, max);
}

/** VINs normalize to uppercase alphanumerics, 11–17 chars (ISO 3779). */
export function normalizeVin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const vin = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (vin.length < 11 || vin.length > 17) return null;
  return vin;
}

function parseYear(value: unknown): string {
  const year =
    typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^(19|20)\d{2}$/.test(year)) {
    throw new ValidationError('"year" must be a 4-digit year.');
  }
  return year;
}

function parseMileage(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 3_000_000) {
    throw new ValidationError('"mileage" must be a number between 0 and 3,000,000.');
  }
  return Math.round(n);
}

/**
 * The owner's add-a-vehicle spec (Nov 3 2026), enforced HERE — the
 * server is the enforcement; the form only mirrors it:
 *   REQUIRED: year, make, model, engine/cylinders, current mileage.
 *   OPTIONAL: trim, VIN, color, license plate, nickname.
 */
function parseRequiredEngine(value: unknown): string {
  const engine = cleanString(value, 80);
  if (!engine) {
    throw new ValidationError(
      'An "engine" is required — e.g. "2.0L 4-cylinder" or "3.5L V6".',
    );
  }
  return engine;
}

function parseRequiredMileage(value: unknown): number {
  const mileage = parseMileage(value);
  if (mileage === null) {
    throw new ValidationError('"mileage" is required — the current odometer reading.');
  }
  return mileage;
}

/** Plates store trimmed + uppercase, like VINs. */
function optionalPlate(value: unknown): string | null {
  const plate = optionalString(value, 16);
  return plate ? plate.toUpperCase() : null;
}

export async function createVehicle(
  store: AppStore,
  ownerId: string,
  body: Record<string, unknown>,
): Promise<VehicleRecord> {
  const make = cleanString(body.make, 80);
  const model = cleanString(body.model, 80);
  if (!make) throw new ValidationError('A non-empty "make" is required.');
  if (!model) throw new ValidationError('A non-empty "model" is required.');
  let vin: string | null = null;
  if (body.vin !== undefined && body.vin !== null && body.vin !== "") {
    vin = normalizeVin(body.vin);
    if (!vin) throw new ValidationError('"vin" could not be read — check the 17 characters and try again.');
  }
  return store.createVehicle({
    ownerId,
    year: parseYear(body.year),
    make,
    model,
    trim: optionalString(body.trim, 80),
    vin,
    engine: parseRequiredEngine(body.engine),
    mileage: parseRequiredMileage(body.mileage),
    color: optionalString(body.color, 40),
    licensePlate: optionalPlate(body.licensePlate),
    nickname: optionalString(body.nickname, 80),
  });
}

export async function listVehicles(store: AppStore, ownerId: string): Promise<VehicleRecord[]> {
  return store.listVehiclesByOwner(ownerId);
}

export async function getVehicleDetail(
  store: AppStore,
  ownerId: string,
  vehicleId: string,
): Promise<{ vehicle: VehicleRecord; diagnoses: DiagnosisSummary[] }> {
  const vehicle = await store.findVehicleById(vehicleId);
  if (!vehicle || vehicle.ownerId !== ownerId) throw new NotFoundError("Vehicle not found.");
  const diagnoses = await store.listVehicleDiagnoses(vehicleId);
  return { vehicle, diagnoses };
}

export async function updateVehicle(
  store: AppStore,
  ownerId: string,
  vehicleId: string,
  body: Record<string, unknown>,
): Promise<VehicleRecord> {
  const patch: VehiclePatch = {};
  if (body.year !== undefined) patch.year = parseYear(body.year);
  if (body.make !== undefined) {
    const make = cleanString(body.make, 80);
    if (!make) throw new ValidationError('A non-empty "make" is required.');
    patch.make = make;
  }
  if (body.model !== undefined) {
    const model = cleanString(body.model, 80);
    if (!model) throw new ValidationError('A non-empty "model" is required.');
    patch.model = model;
  }
  if (body.trim !== undefined) patch.trim = optionalString(body.trim, 80);
  if (body.nickname !== undefined) patch.nickname = optionalString(body.nickname, 80);
  if (body.engine !== undefined) patch.engine = parseRequiredEngine(body.engine);
  if (body.color !== undefined) patch.color = optionalString(body.color, 40);
  if (body.licensePlate !== undefined) patch.licensePlate = optionalPlate(body.licensePlate);
  if (body.mileage !== undefined) patch.mileage = parseMileage(body.mileage);
  if (body.vin !== undefined) {
    if (body.vin === null || body.vin === "") {
      patch.vin = null;
    } else {
      const vin = normalizeVin(body.vin);
      if (!vin) throw new ValidationError('"vin" could not be read — check the 17 characters and try again.');
      patch.vin = vin;
    }
  }
  const updated = await store.updateVehicle(vehicleId, ownerId, patch);
  if (!updated) throw new NotFoundError("Vehicle not found.");
  return updated;
}

export async function deleteVehicle(
  store: AppStore,
  ownerId: string,
  vehicleId: string,
): Promise<void> {
  const deleted = await store.deleteVehicle(vehicleId, ownerId);
  if (!deleted) throw new NotFoundError("Vehicle not found.");
}
