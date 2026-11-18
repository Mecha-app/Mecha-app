"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Pass #19 (2026-11-17, owner order) — demo, estimates explainer,
 * quality evidence, safer quote language, human-help route.
 *
 * Pinned rules:
 *   - the demo is CANNED sample content: no fetch, no API route
 *     strings, no live call of any kind in the demo components —
 *     demo traffic can never burn AI credit, and the standing
 *     rule (a real diagnosis requires an account) is untouched;
 *   - the sample diagnosis is the REAL 2026-11-16 verified
 *     dashboard reading (traction control Minor, battery/charging
 *     Critical, oil pressure Critical, check engine Moderate,
 *     fuel pump Moderate) — honest proof, labeled a sample;
 *   - the demo ends at the account door (/register), and the
 *     homepage reaches it from the hero link + its own section
 *     directly under the hero (pass #17 order otherwise intact);
 *   - the estimates explainer claims only what the codebase does
 *     (AI estimate from the car + the job's parts and labor time)
 *     — no pricing database, no accuracy statistics, no
 *     competitor names, no invented numbers;
 *   - customer stories render ONLY from a non-empty stories prop;
 *     MECHA has no permissioned stories yet, so none ship;
 *   - the quote-check vocabulary is "within range" / "above the
 *     estimate range" / "ask the shop to explain" in EN, with the
 *     old accusatory verdict words gone from every dictionary;
 *   - the human-help card routes only to what exists (/app/nearby
 *     in the app, a free account for visitors) — no hotline, no
 *     phone number, nothing invented.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const en_1 = __importDefault(require("../lib/i18n/dictionaries/en"));
const pt_1 = __importDefault(require("../lib/i18n/dictionaries/pt"));
const de_1 = __importDefault(require("../lib/i18n/dictionaries/de"));
const it_1 = __importDefault(require("../lib/i18n/dictionaries/it"));
const pl_1 = __importDefault(require("../lib/i18n/dictionaries/pl"));
const ru_1 = __importDefault(require("../lib/i18n/dictionaries/ru"));
const uk_1 = __importDefault(require("../lib/i18n/dictionaries/uk"));
const tr_1 = __importDefault(require("../lib/i18n/dictionaries/tr"));
const ar_1 = __importDefault(require("../lib/i18n/dictionaries/ar"));
const he_1 = __importDefault(require("../lib/i18n/dictionaries/he"));
const root = process.cwd();
const read = (rel) => (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, rel), "utf8");
const API_NEEDLES = ["/api/diagnose", "/api/scan/photo", "/api/vin/decode"];
const COMPETITORS = ["FIXD", "Carly", "TorqueBot", "CarMD", "AIMECH", "AI Mechanic"];
(0, node_test_1.test)("demo: canned only — no fetch, no API strings, no live calls in the demo components", () => {
    for (const rel of ["components/GuidedDemo.tsx", "components/HomeDemo.tsx", "app/demo/page.tsx"]) {
        const src = read(rel);
        strict_1.default.ok(!src.includes("fetch("), `${rel} never fetches`);
        for (const needle of API_NEEDLES) {
            strict_1.default.ok(!src.includes(needle), `${rel} never references ${needle}`);
        }
    }
    const demo = read("components/GuidedDemo.tsx");
    strict_1.default.ok(!demo.includes("OpenRouter") && !demo.includes("openrouter"), "no AI provider wiring in the demo");
});
(0, node_test_1.test)("demo: labeled a sample throughout, built from the real verified dashboard reading", () => {
    const demo = read("components/GuidedDemo.tsx");
    strict_1.default.ok(demo.includes("sampleLabel"), "the Sample chip renders from the catalog");
    strict_1.default.ok(demo.includes("sampleNote"), "the sample note renders from the catalog");
    // The five lights of the 2026-11-16 verified test, in order,
    // with the severities that test actually returned.
    const lights = [
        ["light1", "sevMinor"],
        ["light2", "sevCritical"],
        ["light3", "sevCritical"],
        ["light4", "sevModerate"],
        ["light5", "sevModerate"],
    ];
    for (const [light, sev] of lights) {
        strict_1.default.ok(demo.includes(`${light}Name`), `demo renders ${light}Name`);
        strict_1.default.ok(demo.includes(`${light}Meaning`), `demo renders ${light}Meaning`);
        strict_1.default.ok(demo.includes(sev), `demo renders ${sev} for ${light}`);
    }
    strict_1.default.equal(en_1.default.demo.light2Name, "Battery / charging");
    strict_1.default.equal(en_1.default.demo.sevCritical, "Critical");
    // The walk ends at the account door — the demo never pretends
    // to run a real diagnosis.
    strict_1.default.ok(demo.includes('href="/register"'), "final step routes to account creation");
    strict_1.default.ok(demo.includes("step4Cta"), "final CTA comes from the catalog");
});
(0, node_test_1.test)("demo: reachable — /demo route exists, homepage section under the hero, hero text link", () => {
    const page = read("app/demo/page.tsx");
    strict_1.default.ok(page.includes("<GuidedDemo"), "the /demo route renders the guided demo");
    const home = read("components/HomeDemo.tsx");
    strict_1.default.ok(home.includes('href="/demo"'), "the homepage demo section links to /demo");
    strict_1.default.ok(home.includes("t.demo") && home.includes("d.title"), "the section headline comes from the catalog");
    const hero = read("components/Hero.tsx");
    strict_1.default.ok(hero.includes('href="/demo"'), "the hero carries the demo link");
    strict_1.default.ok(hero.includes("t.hero.demoCta"), "the hero demo link label comes from the catalog");
});
(0, node_test_1.test)("estimates explainer: describes only what the code does — no database, no stats, no competitors", () => {
    const explainer = read("components/EstimateExplainer.tsx");
    strict_1.default.ok(explainer.includes('id="how-estimates"'), "the section is the demo's link target");
    strict_1.default.ok(!explainer.includes("%"), "no percentage claims in the explainer");
    for (const name of COMPETITORS) {
        strict_1.default.ok(!explainer.includes(name), `no competitor named: ${name}`);
    }
    const body = en_1.default.estimates.body.toLowerCase();
    strict_1.default.ok(!body.includes("database"), "no pricing-database claim");
    strict_1.default.ok(!body.includes("%"), "no accuracy statistic");
    // The three true price movers are the section's three cards.
    for (const key of ["locationTitle", "vehicleTitle", "partsTitle"]) {
        strict_1.default.ok(explainer.includes(`e.${key}`), `explainer renders ${key}`);
        strict_1.default.ok(en_1.default.estimates[key].length > 0, `en.estimates.${key} exists`);
    }
    // The /diagnose page carries the explainer and the uncertainty
    // example (the fuller home for both).
    const routes = read("components/MarketingRoutes.tsx");
    strict_1.default.ok(routes.includes("<EstimateExplainer"), "/diagnose renders the explainer");
    strict_1.default.ok(routes.includes("<UncertaintyExample"), "/diagnose renders the uncertainty example");
});
(0, node_test_1.test)("quality evidence: uncertainty example is real; stories render only when real ones are passed", () => {
    const unc = read("components/UncertaintyExample.tsx");
    strict_1.default.ok(unc.includes("stories.length > 0"), "stories render only from a non-empty prop");
    strict_1.default.ok(unc.includes("stories = []"), "the default is zero stories — none invented");
    for (const name of COMPETITORS) {
        strict_1.default.ok(!unc.includes(name), `no competitor named: ${name}`);
    }
    // The example shows its work: three possible causes, one wide
    // range, and what would narrow it down.
    for (const key of ["cause1", "cause2", "cause3", "rangeValue", "helpsTitle", "help1", "help2", "help3"]) {
        strict_1.default.ok(unc.includes(`u.${key}`), `uncertainty example renders ${key}`);
    }
    strict_1.default.equal(en_1.default.uncertainty.rangeValue, "$150–$700");
});
(0, node_test_1.test)("quote language: the safer vocabulary in EN, old accusatory verdicts gone from every dictionary", () => {
    strict_1.default.equal(en_1.default.fairPrice.verdictWord, "Above the estimate range");
    strict_1.default.equal(en_1.default.fairPrice.lines.part.verdict, "Above the estimate range");
    strict_1.default.equal(en_1.default.fairPrice.lines.labor.verdict, "Within range");
    strict_1.default.equal(en_1.default.fairPrice.lines.supplies.verdict, "Ask the shop to explain");
    strict_1.default.ok(en_1.default.pillars.protect.point1.includes("within range"), "protect point1 uses the new vocabulary");
    strict_1.default.ok(en_1.default.pillars.protect.detail.includes("ask the shop to explain"), "protect detail uses the new vocabulary");
    const OLD_WORDS = [
        "Wucher",
        "Грабеж",
        "Грабіж",
        "Naciąganie",
        "Esagerato",
        "Abusivo",
        "Abusif",
        "ניפוח",
        "مبالغ فيه",
        "rip-off",
        "Rip-off",
    ];
    for (const code of ["en", "es", "fr", "ht", "pt", "de", "it", "pl", "ru", "uk", "tr", "ar", "he"]) {
        const dict = read(`lib/i18n/dictionaries/${code}.ts`);
        for (const word of OLD_WORDS) {
            strict_1.default.ok(!dict.includes(word), `${code} no longer carries the old verdict word: ${word}`);
        }
    }
});
(0, node_test_1.test)("human help: urgent + unsure cards route only to what exists — no hotline, no phone number", () => {
    const card = read("components/HumanHelpCard.tsx");
    strict_1.default.ok(card.includes('role={urgent ? "alert" : undefined}'), "the urgent card announces itself");
    strict_1.default.ok(card.includes('"/app/nearby"'), "in-app route is the existing nearby-shops page");
    strict_1.default.ok(card.includes('"/register"'), "public route is a free account, said plainly");
    strict_1.default.ok(!card.includes('href="tel:'), "the card never offers a call link");
    strict_1.default.ok(!/hotline/i.test(Object.values(en_1.default.help).join(" ")), "no user-facing help copy implies a hotline");
    strict_1.default.ok(!/\d{3}[-.]\d{3}[-.]\d{4}/.test(card), "no phone number is invented");
    strict_1.default.ok(en_1.default.help.urgentBody.includes("towed"), "urgent guidance is stop-and-tow, in words");
    // Wired into the surfaces: demo step 1 (urgent), the real
    // diagnose report (urgent on Critical / not safe to drive,
    // unsure when nothing came back likely), and the photo scan
    // (urgent on any Critical light).
    strict_1.default.ok(read("components/GuidedDemo.tsx").includes('variant="urgent"'), "demo shows the urgent card");
    const diag = read("app/app/diagnose/page.tsx");
    strict_1.default.ok(diag.includes("<HumanHelpCard"), "diagnose report renders the help card");
    strict_1.default.ok(diag.includes('report.severity === "Critical"'), "diagnose urgent trigger is the report severity");
    strict_1.default.ok(diag.includes("!report.safeToDriver"), "diagnose urgent trigger includes not-safe-to-drive");
    const scan = read("app/app/scan/page.tsx");
    strict_1.default.ok(scan.includes("<HumanHelpCard"), "photo scan renders the help card");
});
(0, node_test_1.test)("i18n: the new namespaces are fully translated in every growth locale", () => {
    const growth = { pt: pt_1.default, de: de_1.default, it: it_1.default, pl: pl_1.default, ru: ru_1.default, uk: uk_1.default, tr: tr_1.default, ar: ar_1.default, he: he_1.default };
    const namespaces = ["demo", "estimates", "uncertainty", "help"];
    for (const [code, dict] of Object.entries(growth)) {
        for (const ns of namespaces) {
            const enKeys = Object.keys(en_1.default[ns]);
            const own = dict[ns];
            strict_1.default.ok(own, `${code} carries the ${ns} namespace`);
            for (const key of enKeys) {
                strict_1.default.equal(typeof own[key], "string", `${code}.${ns}.${key} is translated`);
                strict_1.default.ok(own[key].length > 0, `${code}.${ns}.${key} is non-empty`);
            }
        }
        const hero = dict["hero"];
        strict_1.default.equal(typeof hero["demoCta"], "string", `${code}.hero.demoCta is translated`);
        // The verdict word is the new vocabulary in this locale too.
        const fp = dict["fairPrice"];
        const lines = fp["lines"];
        strict_1.default.equal(fp["verdictWord"], lines["part"]["verdict"], `${code} verdictWord matches its part verdict`);
    }
});
