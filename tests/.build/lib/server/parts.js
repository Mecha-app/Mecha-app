"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTS_DISCLOSURE = exports.SPONSORED_REL = exports.RETAILER_TEMPLATES = void 0;
exports.getPartsConfig = getPartsConfig;
exports.parseVehicleInfo = parseVehicleInfo;
exports.deriveFitment = deriveFitment;
exports.buildSearchUrl = buildSearchUrl;
exports.partSearchQuery = partSearchQuery;
exports.buildPartsBlock = buildPartsBlock;
exports.RETAILER_TEMPLATES = [
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
/** Read the config at call time (env is request-time truth, and tests
 *  pass their own env). Templates are the code-level defaults above;
 *  only tags ever come from the environment. */
function getPartsConfig(env = process.env) {
    return {
        retailers: exports.RETAILER_TEMPLATES.map((t) => {
            const raw = t.tagEnv ? env[t.tagEnv] : undefined;
            const tag = typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
            return { ...t, tag };
        }),
    };
}
const ENGINE_TOKEN = /^(\d\.\d\s?l|v\d{1,2}|i\d|flat-?\d|h\d)$/i;
function clean(v) {
    if (v === null || v === undefined)
        return null;
    const s = String(v).trim().replace(/\s+/g, " ");
    return s.length > 0 ? s : null;
}
function parseVehicleInfo(vehicleInfo) {
    const tokens = vehicleInfo.trim().split(/\s+/).filter(Boolean);
    const yearIdx = tokens.findIndex((t) => /^(19|20)\d{2}$/.test(t));
    if (yearIdx === -1)
        return {};
    const year = tokens[yearIdx];
    const rest = tokens.slice(yearIdx + 1);
    if (rest.length === 0)
        return { year };
    const make = rest[0];
    const tail = rest.slice(1);
    // An engine token ("2.0L", "V6") anywhere in the tail is the engine,
    // not part of the model name.
    const engineIdx = tail.findIndex((t) => ENGINE_TOKEN.test(t.replace(/,$/, "")));
    let engine;
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
function deriveFitment(vehicle = {}) {
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
exports.SPONSORED_REL = "sponsored nofollow noopener";
function buildSearchUrl(retailer, query) {
    let url = retailer.searchUrl.replace("{query}", encodeURIComponent(query));
    if (retailer.tag && retailer.tagParam) {
        url += `${url.includes("?") ? "&" : "?"}${retailer.tagParam}=${encodeURIComponent(retailer.tag)}`;
    }
    return url;
}
/** The search query for one part: fitment tokens first, then the part. */
function partSearchQuery(fitment, partName) {
    return [fitment.searchPrefix, partName].filter(Boolean).join(" ").trim();
}
// ---------------------------------------------------------------------------
// The block — render data. The disclosure is DATA (rule b): it exists
// in every block this function returns, whatever the config.
// ---------------------------------------------------------------------------
exports.PARTS_DISCLOSURE = "Parts links: MECHA may earn a commission when you buy through these links. " +
    "It never changes the price you pay, and it never influences your diagnosis — " +
    "these links are built from the finished report, after the verdict.";
function buildPartsBlock(input) {
    const config = input.config ?? getPartsConfig();
    const audience = input.audience === "shop" ? "shop" : "driver";
    const fitment = deriveFitment(input.vehicle ?? {});
    const fitmentNote = fitment.complete
        ? `Fitted to your ${fitment.display} — confirm fitment on the retailer's page before ordering.`
        : "Your vehicle wasn't fully specified, so check fitment carefully on the retailer's page before ordering.";
    const parts = (input.diagnosis.parts ?? []).map((part) => {
        const query = partSearchQuery(fitment, part.name);
        return {
            name: part.name,
            whyNeeded: part.description,
            likelihood: part.likelihood,
            likelihoodLabel: part.likelihood === "likely" ? "Most likely cause" : "Possible cause",
            estimateLabel: typeof part.estimatedCost === "string" && part.estimatedCost.trim().length > 0
                ? `MECHA's estimate: ${part.estimatedCost}`
                : null,
            fitmentNote,
            priceCta: "Check price",
            links: config.retailers.map((r) => ({
                retailerKey: r.key,
                retailerName: r.name,
                url: buildSearchUrl(r, query),
                rel: exports.SPONSORED_REL,
                target: "_blank",
            })),
        };
    });
    // A discount renders ONLY off a template that declares one AND
    // carries the program's terms (rule b — "terms on file first").
    const discounted = config.retailers.find((r) => r.discount && r.discount.label.trim().length > 0 && r.discount.termsUrl.trim().length > 0);
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
        intro: audience === "shop"
            ? "Stock the parts this job needs. Order them through MECHA's links for your shop's basket — every link is fitted to this vehicle."
            : "Two ways forward: fix it yourself with the exact parts this diagnosis points to, or hand the report to a shop near you.",
        disclosure: exports.PARTS_DISCLOSURE,
        discountNote,
        fitment,
        parts,
        doors: {
            diy: {
                label: audience === "shop" ? "Order parts for this job" : "Fix it yourself — order the parts",
                note: audience === "shop"
                    ? "Fitted to the customer's vehicle, ready for your parts order."
                    : "The parts below are fitted to your vehicle. Live prices are at the retailer.",
            },
            doneForYou: {
                label: audience === "shop" ? "How drivers find you" : "Done for you — shops near you",
                note: audience === "shop"
                    ? "Drivers nearby find shops in this same search — name first, one tap to call."
                    : "Shops near you, name first, one tap to call — they can see this report when you arrive.",
                href: "/app/nearby",
            },
        },
    };
}
