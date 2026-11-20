/**
 * Vehicle catalog for the manual "add by details" form (Scan page
 * redesign, owner order 2026-11-20: the manual vehicle form is the
 * PRIMARY way to add a vehicle — year, car brand, model, engine
 * size, mileage — with the VIN as the alternative door).
 *
 * Pure module, client-safe: the option lists + the form's validation
 * math live here so the page and the test suite agree exactly.
 *
 * DATA SOURCING (honest, per surface):
 *   - Years: a generated range — next model year down to 1980. The
 *     server accepts any 19xx/20xx year; the range is a UI courtesy,
 *     not a coverage claim.
 *   - Makes: the makes the /cars pages already carry (Ford, Toyota,
 *     Honda, Chevrolet, Nissan) plus the common US-market brands.
 *     Anything else goes through the form's "Other…" free entry —
 *     the list is a shortcut, never a gate.
 *   - Models: NOT listed here — they cascade from vPIC
 *     (GetModelsForMakeYear) through /api/vehicles/models, the same
 *     government data the VIN decode uses. When vPIC has no list
 *     for a year+make, the form falls back to free entry.
 *   - Engine sizes: the common displacements, plus free entry for
 *     everything the list doesn't carry (hybrids' pairings, diesels,
 *     electrics are typed, not guessed).
 */

/** Select sentinel: the driver picks it to type a value instead. */
export const OTHER_OPTION = "__other__";

const FIRST_YEAR = 1980;

function buildYears(): string[] {
  const last = new Date().getFullYear() + 1;
  const years: string[] = [];
  for (let y = last; y >= FIRST_YEAR; y--) years.push(String(y));
  return years;
}

/** Model years offered by the form, newest first. */
export const VEHICLE_YEARS: readonly string[] = buildYears();

/**
 * Makes offered by the form: the /cars pages' makes first, then the
 * common US-market brands alphabetically. Free entry covers the rest.
 */
export const COMMON_MAKES: readonly string[] = [
  "Ford",
  "Toyota",
  "Honda",
  "Chevrolet",
  "Nissan",
  "Acura",
  "Audi",
  "BMW",
  "Buick",
  "Cadillac",
  "Chrysler",
  "Dodge",
  "GMC",
  "Genesis",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Mazda",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Porsche",
  "Ram",
  "Rivian",
  "Subaru",
  "Tesla",
  "Volkswagen",
  "Volvo",
];

/** Common engine displacements offered by the form (free entry after). */
export const COMMON_ENGINE_SIZES: readonly string[] = [
  "1.0L",
  "1.2L",
  "1.4L",
  "1.5L",
  "1.6L",
  "1.8L",
  "2.0L",
  "2.2L",
  "2.4L",
  "2.5L",
  "2.7L",
  "3.0L",
  "3.2L",
  "3.3L",
  "3.5L",
  "3.6L",
  "3.7L",
  "4.0L",
  "4.3L",
  "4.6L",
  "4.8L",
  "5.0L",
  "5.3L",
  "5.7L",
  "6.0L",
  "6.2L",
  "6.7L",
  "7.3L",
];

/** The fields the manual form collects, as the driver entered them. */
export interface ManualVehicleInput {
  year: string;
  make: string;
  model: string;
  engine: string;
  mileage: string;
}

/**
 * Parse a typed mileage ("82,000", "82000", " 82 000 ") into the
 * odometer number the vault stores. Mirrors the server's rule
 * (vehicleService.parseMileage): a finite number, 0 to 3,000,000,
 * rounded. Anything else is null — invalid, never guessed.
 */
export function parseMileageInput(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 3_000_000) return null;
  return Math.round(n);
}

/** A 4-digit 19xx/20xx year — the server's parseYear rule, mirrored. */
export function isVehicleYear(raw: string): boolean {
  return /^(19|20)\d{2}$/.test(raw.trim());
}

/**
 * Ready to DIAGNOSE: the vehicle line needs year + make + model —
 * the same identity the decoded-VIN handoff carries (engine joins
 * the line when present). Mileage is not part of the diagnosis
 * vehicle line on the VIN path either.
 */
export function manualDiagnoseReady(input: ManualVehicleInput): boolean {
  return (
    isVehicleYear(input.year) &&
    input.make.trim().length > 0 &&
    input.model.trim().length > 0
  );
}

/**
 * Ready to SAVE to the vault: everything diagnose needs, plus the
 * two fields the owner's add-a-vehicle spec makes required —
 * engine and current mileage (vehicleService enforces the same).
 */
export function manualSaveReady(input: ManualVehicleInput): boolean {
  return (
    manualDiagnoseReady(input) &&
    input.engine.trim().length > 0 &&
    parseMileageInput(input.mileage) !== null
  );
}
