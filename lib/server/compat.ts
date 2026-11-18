/**
 * Compatibility checker logic (Pass #20 — the Carly lesson: let a
 * visitor see exactly what works for THEIR car before anyone asks
 * them to sign up). Pure rules over year/make/model, mirroring what
 * the product actually does today:
 *
 *   - AI diagnosis + dashboard-photo scan + fair-price range: work
 *     for any car — they read the driver's description and photos,
 *     not the car's computer.
 *   - VIN decode + recall/complaint/safety data: served by NHTSA's
 *     vPIC and recalls APIs, which cover US-market vehicles from
 *     model year 1996 (the OBD-II era) forward. Older cars honestly
 *     get a "not covered" — NHTSA's data simply starts there.
 *
 * The page renders these rules with localized basis text; this
 * module owns only the verdicts, so the page and the tests agree.
 */

export type CompatFeatureKey = "diagnosis" | "photoScan" | "vinData" | "fairPrice";

export interface CompatFeature {
  key: CompatFeatureKey;
  applies: boolean;
}

export interface CompatResult {
  year: number;
  features: CompatFeature[];
}

export function compatForVehicle(input: { year: number }): CompatResult {
  const vinCovered = Number.isFinite(input.year) && input.year >= 1996;
  return {
    year: input.year,
    features: [
      { key: "diagnosis", applies: true },
      { key: "photoScan", applies: true },
      { key: "vinData", applies: vinCovered },
      { key: "fairPrice", applies: true },
    ],
  };
}
