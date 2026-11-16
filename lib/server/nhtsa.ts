/**
 * NHTSA public data — server-side only, keyless by design. This is
 * the full free surface of the U.S. government vehicle APIs
 * (API_PLAN_2026-11-15 §1.1 — $0 licensing, no key, no signup):
 *   - vPIC VIN decode:  https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/
 *   - Recalls:          https://webapi.nhtsa.gov/api/Recalls/vehicle
 *   - Complaints:       https://webapi.nhtsa.gov/api/Complaints/vehicle
 *   - Safety ratings:   https://webapi.nhtsa.gov/api/SafetyRatings/…
 *
 * They are called ONLY from the server: the client never sees a
 * third-party endpoint in its critical path, and a slow or down
 * NHTSA degrades to "no enrichment" (null) rather than failing the
 * owner's request — the vehicle the driver typed in is never held
 * hostage to an outside service. Results are cached in-process with
 * a TTL: government reference data changes slowly, and a decode or
 * rating lookup should not re-hit Washington on every page view.
 *
 * HONESTY RULE: everything here is reference data about the MODEL —
 * factory specs, manufacturer safety recalls, owner complaints, and
 * government crash-test ratings. None of it diagnoses the driver's
 * current problem, and the UI labels it exactly that way.
 */

const FETCH_TIMEOUT_MS = 6000;

/** Decodes are factory facts — they never change for a given VIN. */
const DECODE_TTL_MS = 24 * 60 * 60 * 1000;
/** Recalls/complaints grow over time; half a day is fresh enough. */
const RECALLS_TTL_MS = 12 * 60 * 60 * 1000;
const COMPLAINTS_TTL_MS = 12 * 60 * 60 * 1000;
/** Crash-test ratings are published once per model year. */
const RATINGS_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  at: number;
  value: unknown;
}

const cache = new Map<string, CacheEntry>();

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T | null>): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  // Only successes are cached — a NHTSA outage must not pin "no data"
  // on a vehicle for the whole TTL.
  if (value !== null) cache.set(key, { at: Date.now(), value });
  return value;
}

/** Test seam: the module cache is process state, so tests reset it. */
export function clearNhtsaCache(): void {
  cache.clear();
}

export interface VinDecode {
  vin: string;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  /** Body style, e.g. "SEDAN 4-DR" (vPIC BodyClass). */
  bodyClass: string | null;
  /** Drivetrain, e.g. "RWD" / "AWD/All-Wheel Drive" (vPIC DriveType). */
  driveType: string | null;
  /** Transmission, style + speeds composed, e.g. "Automatic, 8-speed". */
  transmission: string | null;
  /** Primary fuel, e.g. "Gasoline" (vPIC FuelTypePrimary). */
  fuelType: string | null;
  doors: string | null;
  /** Assembly plant composed "City, State, Country" from vPIC plant fields. */
  plant: string | null;
  manufacturer: string | null;
  /** vPIC's own decode-quality note ("0" = clean). */
  errorCode: string | null;
}

export interface Recall {
  campaignNumber: string | null;
  component: string | null;
  summary: string | null;
  consequence: string | null;
  remedy: string | null;
  reportedAt: string | null;
}

export interface Complaint {
  component: string | null;
  summary: string | null;
  filedAt: string | null;
}

export interface ComplaintsResult {
  /** Total complaints NHTSA holds for this year/make/model. */
  count: number;
  /** Most-reported components across the returned complaints, max 3. */
  topComponents: string[];
  /** Newest complaints first, max 3. */
  recent: Complaint[];
}

export interface SafetyRatings {
  /** The rated variant NHTSA matched, e.g. "2020 BMW 330i 4 DR RWD". */
  vehicleDescription: string | null;
  /** Star ratings 1–5; null where NHTSA says "Not Rated". */
  overall: number | null;
  frontal: number | null;
  frontalDriver: number | null;
  frontalPassenger: number | null;
  side: number | null;
  sideDriver: number | null;
  sidePassenger: number | null;
  rollover: number | null;
}

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The webapi family answers `results`; SafetyRatings answers `Results`. */
function rowsOf(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  const rows = record.results ?? record.Results;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

export async function decodeVin(vin: string): Promise<VinDecode | null> {
  return cached(`decode:${vin}`, DECODE_TTL_MS, async () => {
    const data = (await fetchJson(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`,
    )) as { Results?: Array<Record<string, unknown>> } | null;
    const row = data?.Results?.[0];
    if (!row) return null;
    const engineParts = [str(row.EngineModel), str(row.DisplacementL) ? `${str(row.DisplacementL)}L` : null]
      .filter(Boolean)
      .join(" ")
      .trim();
    const transmissionParts = [
      str(row.TransmissionStyle),
      str(row.TransmissionSpeeds) ? `${str(row.TransmissionSpeeds)}-speed` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const plantParts = [str(row.PlantCity), str(row.PlantState), str(row.PlantCountry)]
      .filter(Boolean)
      .join(", ");
    return {
      vin,
      year: str(row.ModelYear),
      make: str(row.Make),
      model: str(row.Model),
      trim: str(row.Trim),
      engine: engineParts.length > 0 ? engineParts : null,
      bodyClass: str(row.BodyClass),
      driveType: str(row.DriveType),
      transmission: transmissionParts.length > 0 ? transmissionParts : null,
      fuelType: str(row.FuelTypePrimary),
      doors: str(row.Doors),
      plant: plantParts.length > 0 ? plantParts : null,
      manufacturer: str(row.Manufacturer),
      errorCode: str(row.ErrorCode),
    };
  });
}

export async function fetchRecalls(input: {
  make: string;
  model: string;
  year: string;
}): Promise<Recall[] | null> {
  const key = `recalls:${input.year}|${input.make.toLowerCase()}|${input.model.toLowerCase()}`;
  return cached(key, RECALLS_TTL_MS, async () => {
    const params = new URLSearchParams({
      make: input.make,
      model: input.model,
      modelYear: input.year,
    });
    const data = await fetchJson(`https://webapi.nhtsa.gov/api/Recalls/vehicle?${params.toString()}`);
    if (!data) return null;
    return rowsOf(data).map((r) => ({
      campaignNumber: str(r.NHTSACampaignNumber),
      component: str(r.Component),
      summary: str(r.Summary),
      consequence: str(r.Consequence),
      remedy: str(r.Remedy),
      reportedAt: str(r.ReportReceivedDate),
    }));
  });
}

export async function fetchComplaints(input: {
  make: string;
  model: string;
  year: string;
}): Promise<ComplaintsResult | null> {
  const key = `complaints:${input.year}|${input.make.toLowerCase()}|${input.model.toLowerCase()}`;
  return cached(key, COMPLAINTS_TTL_MS, async () => {
    const params = new URLSearchParams({
      make: input.make,
      model: input.model,
      modelYear: input.year,
    });
    const data = (await fetchJson(
      `https://webapi.nhtsa.gov/api/Complaints/vehicle?${params.toString()}`,
    )) as Record<string, unknown> | null;
    if (!data) return null;
    const rows = rowsOf(data);
    const total = typeof data.count === "number" && Number.isFinite(data.count) ? data.count : rows.length;
    const componentCounts = new Map<string, number>();
    for (const row of rows) {
      const component = str(row.components);
      if (component) componentCounts.set(component, (componentCounts.get(component) ?? 0) + 1);
    }
    const topComponents = [...componentCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([component]) => component);
    const recent = rows
      .map((row) => ({
        component: str(row.components),
        summary: str(row.summary),
        filedAt: str(row.dateComplaintFiled),
        filedTs: Date.parse(str(row.dateComplaintFiled) ?? "") || 0,
      }))
      .sort((a, b) => b.filedTs - a.filedTs)
      .slice(0, 3)
      .map(({ component, summary, filedAt }) => ({ component, summary, filedAt }));
    return { count: total, topComponents, recent };
  });
}

function rating(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = str(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchSafetyRatings(input: {
  make: string;
  model: string;
  year: string;
}): Promise<SafetyRatings | null> {
  const key = `ratings:${input.year}|${input.make.toLowerCase()}|${input.model.toLowerCase()}`;
  return cached(key, RATINGS_TTL_MS, async () => {
    const variants = await fetchJson(
      `https://webapi.nhtsa.gov/api/SafetyRatings/modelyear/${encodeURIComponent(input.year)}/make/${encodeURIComponent(input.make)}/model/${encodeURIComponent(input.model)}`,
    );
    if (!variants) return null;
    // NHTSA rates specific variants; the first listed match is the
    // documented pick — the UI shows its description so the driver
    // can see exactly which variant the stars belong to.
    const variant = rowsOf(variants).find((row) => row.VehicleId !== undefined && row.VehicleId !== null);
    if (!variant) return null;
    const detail = await fetchJson(
      `https://webapi.nhtsa.gov/api/SafetyRatings/VehicleId/${encodeURIComponent(String(variant.VehicleId))}`,
    );
    if (!detail) return null;
    const row = rowsOf(detail)[0];
    if (!row) return null;
    const ratings: SafetyRatings = {
      vehicleDescription: str(row.VehicleDescription) ?? str(variant.VehicleDescription),
      overall: rating(row.OverallRating),
      frontal: rating(row.OverallFrontalCrashRating),
      frontalDriver: rating(row.FrontalCrashDriversideRating),
      frontalPassenger: rating(row.FrontalCrashPassengersideRating),
      side: rating(row.OverallSideCrashRating),
      sideDriver: rating(row.SideCrashDriversideRating),
      sidePassenger: rating(row.SideCrashPassengersideRating),
      rollover: rating(row.RolloverRating),
    };
    // A variant NHTSA lists but never actually rated has nothing to show.
    if (
      ratings.overall === null &&
      ratings.frontal === null &&
      ratings.side === null &&
      ratings.rollover === null
    ) {
      return null;
    }
    return ratings;
  });
}
