import { ValidationError } from "./authService";
import { NotFoundError } from "./errors";
import type { AppStore, ServiceMarkRecord } from "./appStore";
import {
  MAINTENANCE_ITEMS,
  maintenanceItem,
  maintenanceStates,
  type MaintenanceState,
} from "./maintenance";

/**
 * Maintenance reminder service (Pass #20) — ownership + validation
 * for the /api/vehicles/[id]/maintenance routes, in the vehicle
 * service's pattern: a vehicle is only ever visible to its owner,
 * and another driver's vehicle answers NotFoundError exactly like a
 * missing one. Reminder state is computed (lib/server/maintenance)
 * from the vehicle's own mileage and the owner's marks — nothing is
 * fetched from the car, because nothing can be.
 */

async function ownedVehicle(store: AppStore, ownerId: string, vehicleId: string) {
  const vehicle = await store.findVehicleById(vehicleId);
  if (!vehicle || vehicle.ownerId !== ownerId) throw new NotFoundError("Vehicle not found.");
  return vehicle;
}

export async function getMaintenance(
  store: AppStore,
  ownerId: string,
  vehicleId: string,
  now: Date = new Date(),
): Promise<{ mileage: number | null; states: MaintenanceState[] }> {
  const vehicle = await ownedVehicle(store, ownerId, vehicleId);
  const marks = await store.listServiceMarks(vehicleId);
  return {
    mileage: vehicle.mileage,
    states: maintenanceStates(vehicle.mileage, marks, now),
  };
}

function parseMarkMileage(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 3_000_000) {
    throw new ValidationError('"lastMileage" must be a number between 0 and 3,000,000.');
  }
  return Math.round(n);
}

function parseMarkDate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new ValidationError('"lastDate" must be a date like 2026-11-01.');
  }
  const parsed = new Date(`${value.trim()}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('"lastDate" must be a real date.');
  }
  return value.trim();
}

export async function recordServiceMark(
  store: AppStore,
  ownerId: string,
  vehicleId: string,
  body: Record<string, unknown>,
): Promise<ServiceMarkRecord> {
  await ownedVehicle(store, ownerId, vehicleId);
  const item = typeof body.item === "string" ? maintenanceItem(body.item) : null;
  if (!item) {
    throw new ValidationError(
      `"item" must be one of: ${MAINTENANCE_ITEMS.map((i) => i.key).join(", ")}.`,
    );
  }
  const lastMileage = parseMarkMileage(body.lastMileage);
  const lastDate = parseMarkDate(body.lastDate);
  if (lastMileage === null && lastDate === null) {
    throw new ValidationError('A mark needs a "lastMileage" and/or a "lastDate".');
  }
  return store.upsertServiceMark({
    vehicleId,
    item: item.key,
    lastMileage,
    lastDate,
  });
}
