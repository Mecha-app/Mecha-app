/**
 * NHTSA public data — server-side only, keyless by design. This is
 * the full free surface of the U.S. government vehicle APIs
 * (API_PLAN_2026-11-15 §1.1 — $0 licensing, no key, no signup):
 *   - vPIC VIN decode:  https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/
 *   - Recalls:          https://api.nhtsa.gov/recalls/recallsByVehicle
 *   - Complaints:       https://api.nhtsa.gov/complaints/complaintsByVehicle
 *   - Safety ratings:   https://api.nhtsa.gov/SafetyRatings/…
 *
 * (NHTSA retired the old webapi.nhtsa.gov host/paths — every call to
 * it fails while vPIC still answers, which is exactly the failure the
 * 2026-11-16 live smoke showed. api.nhtsa.gov is the current host;
 * all four feeds were re-verified live against it that day.)
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
/**
 * Complaints answers are whole-history firehoses (a popular model
 * returns megabytes — the 2003 Accord's 2,013 complaints take
 * ~8s from a cold network, measured live 2026-11-16), so this one
 * feed gets a longer budget; the 12h cache means it is paid once
 * per model per instance.
 */
const COMPLAINTS_FETCH_TIMEOUT_MS = 20000;

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

async function fetchJson(url: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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

/**
 * The recalls/complaints endpoints answer a no-match query with
 * HTTP 400 and a well-formed EMPTY success body
 * (`{"Count":0,"Message":"Results returned successfully","results":[]}`)
 * — verified live 2026-11-16. That 400 is data ("no records"), not a
 * failure, so this variant accepts a 400 ONLY when the body is
 * exactly that empty-result shape; any other non-200 stays null.
 */
async function fetchJsonAllowEmptyResult(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (res.ok) return (await res.json()) as unknown;
    if (res.status !== 400) return null;
    const data: unknown = await res.json().catch(() => null);
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;
    const rows = record.results ?? record.Results;
    const count = record.Count ?? record.count;
    return Array.isArray(rows) && rows.length === 0 && count === 0 ? data : null;
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

/** The recalls/complaints family answers `results`; SafetyRatings answers `Results`. */
function rowsOf(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  const rows = record.results ?? record.Results;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

/**
 * NHTSA's safety-issues datasets do not always file a vehicle under
 * the bare model name vPIC returns: the 2013 F-150, for example, has
 * NO ratings or complaints under "F-150" — they live under the cab
 * variants "F-150 REGULAR CAB" / "F-150 SUPER CREW" / "F-150 SUPERCAB"
 * (verified live 2026-11-16). The SafetyRatings model list for a
 * (year, make) is the canonical name source both datasets share, so
 * an exact-name miss retries against these sibling names.
 */
async function fetchNcapModelNames(year: string, make: string): Promise<string[] | null> {
  const data = await fetchJson(
    `https://api.nhtsa.gov/SafetyRatings/modelyear/${encodeURIComponent(year)}/make/${encodeURIComponent(make)}`,
  );
  if (!data) return null;
  const names = rowsOf(data)
    .map((row) => str(row.Model))
    .filter((name): name is string => name !== null);
  return [...new Set(names)];
}

/** Model names that extend the requested one ("F-150" → "F-150 SUPER CREW"). */
function siblingModelNames(models: string[], model: string): string[] {
  const target = model.trim().toUpperCase();
  return models.filter((name) => {
    const upper = name.toUpperCase();
    return upper !== target && upper.startsWith(`${target} `);
  });
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
    const data = await fetchJsonAllowEmptyResult(
      `https://api.nhtsa.gov/recalls/recallsByVehicle?${params.toString()}`,
    );
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

interface RawComplaints {
  total: number;
  rows: Array<Record<string, unknown>>;
}

async function queryComplaints(make: string, model: string, year: string): Promise<RawComplaints | null> {
  const params = new URLSearchParams({ make, model, modelYear: year });
  const data = (await fetchJsonAllowEmptyResult(
    `https://api.nhtsa.gov/complaints/complaintsByVehicle?${params.toString()}`,
    COMPLAINTS_FETCH_TIMEOUT_MS,
  )) as Record<string, unknown> | null;
  if (!data) return null;
  const rows = rowsOf(data);
  const total = typeof data.count === "number" && Number.isFinite(data.count) ? data.count : rows.length;
  return { total, rows };
}

function toComplaintsResult(parts: RawComplaints[]): ComplaintsResult {
  const rows = parts.flatMap((part) => part.rows);
  const total = parts.reduce((sum, part) => sum + part.total, 0);
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
}

export async function fetchComplaints(input: {
  make: string;
  model: string;
  year: string;
}): Promise<ComplaintsResult | null> {
  const key = `complaints:${input.year}|${input.make.toLowerCase()}|${input.model.toLowerCase()}`;
  return cached(key, COMPLAINTS_TTL_MS, async () => {
    const exact = await queryComplaints(input.make, input.model, input.year);
    if (!exact) return null;
    if (exact.total > 0) return toComplaintsResult([exact]);
    // No complaints under the bare model name — for variant-filed
    // vehicles (F-150 and kin) the complaints live under the sibling
    // names, so merge those before concluding there are none. If the
    // sibling lookup itself cannot run, degrade to null rather than
    // claim a false zero.
    const models = await fetchNcapModelNames(input.year, input.make);
    if (models === null) return null;
    const siblings = siblingModelNames(models, input.model).slice(0, 5);
    if (siblings.length === 0) return toComplaintsResult([exact]);
    const parts = await Promise.all(siblings.map((model) => queryComplaints(input.make, model, input.year)));
    if (parts.some((part) => part === null)) return null;
    return toComplaintsResult([exact, ...(parts as RawComplaints[])]);
  });
}

function rating(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = str(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchVariantRows(
  year: string,
  make: string,
  model: string,
): Promise<Array<Record<string, unknown>> | null> {
  const data = await fetchJson(
    `https://api.nhtsa.gov/SafetyRatings/modelyear/${encodeURIComponent(year)}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}`,
  );
  if (!data) return null;
  return rowsOf(data);
}

export async function fetchSafetyRatings(input: {
  make: string;
  model: string;
  year: string;
}): Promise<SafetyRatings | null> {
  const key = `ratings:${input.year}|${input.make.toLowerCase()}|${input.model.toLowerCase()}`;
  return cached(key, RATINGS_TTL_MS, async () => {
    const direct = await fetchVariantRows(input.year, input.make, input.model);
    if (!direct) return null;
    // NHTSA rates specific variants; the first listed match is the
    // documented pick — the UI shows its description so the driver
    // can see exactly which variant the stars belong to.
    let variant = direct.find((row) => row.VehicleId !== undefined && row.VehicleId !== null);
    if (!variant) {
      // No variants under the bare model name — variant-filed
      // vehicles (F-150 and kin) are rated under sibling names.
      const models = await fetchNcapModelNames(input.year, input.make);
      if (models === null) return null;
      for (const sibling of siblingModelNames(models, input.model).slice(0, 5)) {
        const rows = await fetchVariantRows(input.year, input.make, sibling);
        if (!rows) continue;
        variant = rows.find((row) => row.VehicleId !== undefined && row.VehicleId !== null);
        if (variant) break;
      }
    }
    if (!variant) return null;
    const detail = await fetchJson(
      `https://api.nhtsa.gov/SafetyRatings/VehicleId/${encodeURIComponent(String(variant.VehicleId))}`,
    );
    if (!detail) return null;
    const row = rowsOf(detail)[0];
    if (!row) return null;
    const ratings: SafetyRatings = {
      vehicleDescription: str(row.VehicleDescription) ?? str(variant.VehicleDescription),
      overall: rating(row.OverallRating),
      // The live API names these "FrontCrash…"; the "Frontal…" names
      // an earlier fixture set used never existed in its responses.
      frontal: rating(row.OverallFrontCrashRating) ?? rating(row.OverallFrontalCrashRating),
      frontalDriver: rating(row.FrontCrashDriversideRating) ?? rating(row.FrontalCrashDriversideRating),
      frontalPassenger:
        rating(row.FrontCrashPassengersideRating) ?? rating(row.FrontalCrashPassengersideRating),
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
