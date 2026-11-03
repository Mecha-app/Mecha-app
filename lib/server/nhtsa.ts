/**
 * NHTSA public data (WP6) — server-side only, keyless by design:
 *   - vPIC VIN decode: https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/
 *   - Recalls:          https://webapi.nhtsa.gov/api/Recalls/vehicle
 *
 * These are free U.S. government APIs (FEATURE_RESEARCH §1.2 — $0
 * licensing). They are called ONLY from the server: the client never
 * sees a third-party endpoint in its critical path, and a slow or down
 * NHTSA degrades to "no enrichment" (null) rather than failing the
 * owner's request — the vehicle the driver typed in is never held
 * hostage to an outside service.
 */

const FETCH_TIMEOUT_MS = 6000;

export interface VinDecode {
  vin: string;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
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

export async function decodeVin(vin: string): Promise<VinDecode | null> {
  const data = (await fetchJson(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`,
  )) as { Results?: Array<Record<string, unknown>> } | null;
  const row = data?.Results?.[0];
  if (!row) return null;
  const engineParts = [str(row.EngineModel), str(row.DisplacementL) ? `${str(row.DisplacementL)}L` : null]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    vin,
    year: str(row.ModelYear),
    make: str(row.Make),
    model: str(row.Model),
    trim: str(row.Trim),
    engine: engineParts.length > 0 ? engineParts : null,
    errorCode: str(row.ErrorCode),
  };
}

export async function fetchRecalls(input: {
  make: string;
  model: string;
  year: string;
}): Promise<Recall[] | null> {
  const params = new URLSearchParams({
    make: input.make,
    model: input.model,
    modelYear: input.year,
  });
  const data = (await fetchJson(
    `https://webapi.nhtsa.gov/api/Recalls/vehicle?${params.toString()}`,
  )) as { results?: Array<Record<string, unknown>> } | null;
  if (!data) return null;
  if (!Array.isArray(data.results)) return [];
  return data.results.map((r) => ({
    campaignNumber: str(r.NHTSACampaignNumber),
    component: str(r.Component),
    summary: str(r.Summary),
    consequence: str(r.Consequence),
    remedy: str(r.Remedy),
    reportedAt: str(r.ReportReceivedDate),
  }));
}
