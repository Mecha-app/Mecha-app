/**
 * Parts affiliate layer — "what to do next" after a diagnosis.
 *
 * Owner's model (Frantz, 2026-11-03): when a diagnosis states what the
 * vehicle needs, the report offers links to buy those exact parts —
 * for (1) DIY drivers who will fix it themselves, (2) hands-on
 * owners/mechanics, and (3) the platform's SHOPS ordering parts
 * through MECHA (recurring baskets). A buyer-side discount is shown
 * only where a retailer's program genuinely offers one.
 *
 * THREE HARD RULES, structural — not conventions:
 *
 * (a) FITMENT. Every outbound link is built from the user's exact
 *     vehicle (year / make / model, engine where known). The fitment
 *     string leads every search query, and the block states the
 *     fitment it used — or states plainly that the vehicle wasn't
 *     specified, so nobody orders blind.
 *
 * (b) HONEST LABELING. The FTC disclosure is part of the render data
 *     itself (always present, in every variant) and renders with the
 *     block: MECHA may earn a commission; it never changes the buyer's
 *     price. Prices are NEVER stated here — the report's own estimate
 *     is labeled as MECHA's estimate, and the live price lives at the
 *     retailer ("Check price"). A discount line exists ONLY when a
 *     retailer template declares one AND carries its terms URL (the
 *     program's actual terms on file) — the default config declares
 *     none, so no discount copy renders. Outbound links carry
 *     rel="sponsored nofollow noopener" (the FTC/SEO-correct pattern).
 *
 * (c) DIAGNOSIS INTEGRITY. This module consumes the FINISHED diagnosis
 *     output and nothing else. It imports NOTHING from the diagnosis
 *     stack (ai.ts / provider.ts / diagnoseService.ts) — its inputs
 *     are local structural types the finished report happens to
 *     satisfy — and nothing in the diagnosis stack imports it. There
 *     is no code path from here back into the prompt, the ranking, or
 *     the verdict. tests/parts.test.ts pins both directions
 *     (source-level no-import guard + byte-identical diagnosis output
 *     with this layer exercised and not).
 *
 * CONFIG. Retailer templates live in ONE place (RETAILER_TEMPLATES
 * below): search-URL templates keyed by part + vehicle. Affiliate
 * tags come from the environment ONLY (AFFILIATE_TAG_AMAZON today —
 * a retailer gets a tagEnv the moment its template has a parameter
 * to carry the tag) — never hardcoded.
 * Unwired tags → the links still work as plain search links and the
 * disclosure is unchanged. The starting search-URL shapes are
 * defaults to verify against each program's exact terms when the
 * owner's affiliate accounts are created (owner step, see STATUS).
 */

// ---------------------------------------------------------------------------
// Inputs — local structural types (rule c). A finished DiagnosisReport
// satisfies PartsDiagnosisInput without this module knowing it exists.
// ---------------------------------------------------------------------------

export interface PartsDiagnosisPartInput {
  name: string;
  /** the report's own display estimate, e.g. "$120-240" — the
   *  diagnosis's number, carried through and labeled as such */
  estimatedCost: string;
  /** "likely" | "conditional" in the report shape */
  likelihood: string;
  /** the report's own words for why this part is implicated */
  description: string;
}

export interface PartsDiagnosisInput {
  parts: ReadonlyArray<PartsDiagnosisPartInput>;
}

export interface PartsVehicleInput {
  year?: number | string | null;
  make?: string | null;
  model?: string | null;
  engine?: string | null;
  /** free-text fallback — the diagnose form's "2019 Honda Accord" */
  vehicleInfo?: string | null;
}

export type PartsAudience = "driver" | "shop";

// ---------------------------------------------------------------------------
// Retailer config — the ONE place templates live.
// ---------------------------------------------------------------------------

export interface RetailerDiscount {
  /** the program's own words for the buyer benefit, e.g. "5% off for MECHA buyers" */
  label: string;
  /** the program's actual terms, on file — a discount is declared
   *  ONLY when this is present (enforced in buildPartsBlock). */
  termsUrl: string;
}

export interface RetailerTemplate {
  key: string;
  name: string;
  /** search URL containing "{query}" — fitment + part go in the query */
  searchUrl: string;
  /** query param that carries the affiliate tag, when the program has one */
  tagParam?: string;
  /** env var the tag is read from — tags come from env ONLY */
  tagEnv?: string;
  /** a REAL, current program discount — empty by default, on purpose */
  discount?: RetailerDiscount;
}

export const RETAILER_TEMPLATES: RetailerTemplate[] = [
  {
    key: "amazon",
    name: "Amazon",
    searchUrl: "https://www.amazon.com/s?k={query}",
    tagParam: "tag",
    tagEnv: "AFFILIATE_TAG_AMAZON",
  },
  {
    key: "rockauto",
    name: "RockAuto",
    searchUrl: "https://www.rockauto.com/en/partsearch/?partsearch={query}",
    // No tagParam/tagEnv yet: when the owner's RockAuto program is set
    // up, its tracking parameter joins this template in one line.
  },
  {
    key: "partsgeek",
    name: "PartsGeek",
    searchUrl: "https://www.partsgeek.com/search/?q={query}",
    // Same note as RockAuto — program first, tag wiring second.
  },
];

export interface ResolvedRetailer extends RetailerTemplate {
  /** the env-provided tag, or null when unwired (plain search links) */
  tag: string | null;
}

export interface PartsConfig {
  retailers: ResolvedRetailer[];
}

/** Read the config at call time (env is request-time truth, and tests
 *  pass their own env). Templates are the code-level defaults above;
 *  only tags ever come from the environment. */
export function getPartsConfig(env: { [key: string]: string | undefined } = process.env): PartsConfig {
  return {
    retailers: RETAILER_TEMPLATES.map((t) => {
      const raw = t.tagEnv ? env[t.tagEnv] : undefined;
      const tag = typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
      return { ...t, tag };
    }),
  };
}

// ---------------------------------------------------------------------------
// Fitment — rule (a). Structured fields win; the free-text vehicleInfo
// is parsed best-effort ("2019 Honda Accord", "2021 Toyota RAV4 2.5L").
// ---------------------------------------------------------------------------

export interface VehicleFitment {
  year: string | null;
  make: string | null;
  model: string | null;
  engine: string | null;
  /** year+make+model all known — the minimum for an honest fitment claim */
  complete: boolean;
  /** "2019 Honda Accord · 2.0L" — what the block tells the user */
  display: string;
  /** "2019 Honda Accord 2.0L" — the token string leading every query */
  searchPrefix: string;
}

const ENGINE_TOKEN = /^(\d\.\d\s?l|v\d{1,2}|i\d|flat-?\d|h\d)$/i;

function clean(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\s+/g, " ");
  return s.length > 0 ? s : null;
}

export function parseVehicleInfo(vehicleInfo: string): Partial<{
  year: string;
  make: string;
  model: string;
  engine: string;
}> {
  const tokens = vehicleInfo.trim().split(/\s+/).filter(Boolean);
  const yearIdx = tokens.findIndex((t) => /^(19|20)\d{2}$/.test(t));
  if (yearIdx === -1) return {};
  const year = tokens[yearIdx];
  const rest = tokens.slice(yearIdx + 1);
  if (rest.length === 0) return { year };
  const make = rest[0];
  const tail = rest.slice(1);
  // An engine token ("2.0L", "V6") anywhere in the tail is the engine,
  // not part of the model name.
  const engineIdx = tail.findIndex((t) => ENGINE_TOKEN.test(t.replace(/,$/, "")));
  let engine: string | undefined;
  let modelTokens = tail;
  if (engineIdx !== -1) {
    engine = tail[engineIdx].replace(/,$/, "").toUpperCase().replace(/^(\d\.\d)L$/, "$1L");
    modelTokens = tail.filter((_, i) => i !== engineIdx);
  }
  const model = modelTokens.join(" ").replace(/,+$/, "").trim();
  return {
    year,
    make,
    ...(model ? { model } : {}),
    ...(engine ? { engine } : {}),
  };
}

export function deriveFitment(vehicle: PartsVehicleInput = {}): VehicleFitment {
  const parsed = vehicle.vehicleInfo ? parseVehicleInfo(vehicle.vehicleInfo) : {};
  const year = clean(vehicle.year) ?? parsed.year ?? null;
  const make = clean(vehicle.make) ?? parsed.make ?? null;
  const model = clean(vehicle.model) ?? parsed.model ?? null;
  const engine = clean(vehicle.engine) ?? parsed.engine ?? null;
  const complete = Boolean(year && make && model);
  const core = [year, make, model].filter(Boolean).join(" ");
  const searchPrefix = [core, engine].filter(Boolean).join(" ").trim();
  const display = complete
    ? engine
      ? `${core} · ${engine} engine`
      : core
    : searchPrefix || "Vehicle not specified";
  return { year, make, model, engine, complete, display, searchPrefix };
}

// ---------------------------------------------------------------------------
// Link construction.
// ---------------------------------------------------------------------------

export const SPONSORED_REL = "sponsored nofollow noopener";

export interface PartLink {
  retailerKey: string;
  retailerName: string;
  url: string;
  rel: typeof SPONSORED_REL;
  target: "_blank";
}

export function buildSearchUrl(retailer: ResolvedRetailer, query: string): string {
  let url = retailer.searchUrl.replace("{query}", encodeURIComponent(query));
  if (retailer.tag && retailer.tagParam) {
    url += `${url.includes("?") ? "&" : "?"}${retailer.tagParam}=${encodeURIComponent(retailer.tag)}`;
  }
  return url;
}

/** The search query for one part: fitment tokens first, then the part. */
export function partSearchQuery(fitment: VehicleFitment, partName: string): string {
  return [fitment.searchPrefix, partName].filter(Boolean).join(" ").trim();
}

// ---------------------------------------------------------------------------
// The block — render data. The disclosure is DATA (rule b): it exists
// in every block this function returns, whatever the config.
// ---------------------------------------------------------------------------

export const PARTS_DISCLOSURE =
  "Parts links: MECHA may earn a commission when you buy through these links. " +
  "It never changes the price you pay, and it never influences your diagnosis — " +
  "these links are built from the finished report, after the verdict.";

export interface PartOffer {
  name: string;
  /** the ranked cause this part answers, in the report's own words */
  whyNeeded: string;
  likelihood: string;
  likelihoodLabel: string;
  /** the DIAGNOSIS's own estimate string, labeled as MECHA's estimate —
   *  never presented as a live price (rule b) */
  estimateLabel: string | null;
  /** what the links were fitted to — or the honest gap (rule a) */
  fitmentNote: string;
  /** the only price language this layer is allowed: check it live */
  priceCta: "Check price";
  links: PartLink[];
}

export interface PartsBlock {
  heading: "What to do next";
  audience: PartsAudience;
  intro: string;
  /** ALWAYS present (rule b) */
  disclosure: string;
  /** non-null ONLY when a retailer declares a discount WITH terms */
  discountNote: { retailerName: string; label: string; termsUrl: string } | null;
  fitment: VehicleFitment;
  parts: PartOffer[];
  doors: {
    diy: { label: string; note: string };
    doneForYou: { label: string; note: string; href: "/app/nearby" };
  };
}

export function buildPartsBlock(input: {
  diagnosis: PartsDiagnosisInput;
  vehicle?: PartsVehicleInput;
  audience?: PartsAudience;
  config?: PartsConfig;
}): PartsBlock {
  const config = input.config ?? getPartsConfig();
  const audience: PartsAudience = input.audience === "shop" ? "shop" : "driver";
  const fitment = deriveFitment(input.vehicle ?? {});

  const fitmentNote = fitment.complete
    ? `Fitted to your ${fitment.display} — confirm fitment on the retailer's page before ordering.`
    : "Your vehicle wasn't fully specified, so check fitment carefully on the retailer's page before ordering.";

  const parts: PartOffer[] = (input.diagnosis.parts ?? []).map((part) => {
    const query = partSearchQuery(fitment, part.name);
    return {
      name: part.name,
      whyNeeded: part.description,
      likelihood: part.likelihood,
      likelihoodLabel: part.likelihood === "likely" ? "Most likely cause" : "Possible cause",
      estimateLabel:
        typeof part.estimatedCost === "string" && part.estimatedCost.trim().length > 0
          ? `MECHA's estimate: ${part.estimatedCost}`
          : null,
      fitmentNote,
      priceCta: "Check price" as const,
      links: config.retailers.map((r) => ({
        retailerKey: r.key,
        retailerName: r.name,
        url: buildSearchUrl(r, query),
        rel: SPONSORED_REL,
        target: "_blank" as const,
      })),
    };
  });

  // A discount renders ONLY off a template that declares one AND
  // carries the program's terms (rule b — "terms on file first").
  const discounted = config.retailers.find(
    (r) => r.discount && r.discount.label.trim().length > 0 && r.discount.termsUrl.trim().length > 0,
  );
  const discountNote = discounted?.discount
    ? {
        retailerName: discounted.name,
        label: discounted.discount.label,
        termsUrl: discounted.discount.termsUrl,
      }
    : null;

  return {
    heading: "What to do next",
    audience,
    intro:
      audience === "shop"
        ? "Stock the parts this job needs. Order them through MECHA's links for your shop's basket — every link is fitted to this vehicle."
        : "Two ways forward: fix it yourself with the exact parts this diagnosis points to, or hand the report to a shop near you.",
    disclosure: PARTS_DISCLOSURE,
    discountNote,
    fitment,
    parts,
    doors: {
      diy: {
        label: audience === "shop" ? "Order parts for this job" : "Fix it yourself — order the parts",
        note:
          audience === "shop"
            ? "Fitted to the customer's vehicle, ready for your parts order."
            : "The parts below are fitted to your vehicle. Live prices are at the retailer.",
      },
      doneForYou: {
        label: audience === "shop" ? "How drivers find you" : "Done for you — shops near you",
        note:
          audience === "shop"
            ? "Drivers nearby find shops in this same search — name first, one tap to call."
            : "Shops near you, name first, one tap to call — they can see this report when you arrive.",
        href: "/app/nearby",
      },
    },
  };
}
