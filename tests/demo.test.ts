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
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import en from "../lib/i18n/dictionaries/en";
import pt from "../lib/i18n/dictionaries/pt";
import de from "../lib/i18n/dictionaries/de";
import it from "../lib/i18n/dictionaries/it";
import pl from "../lib/i18n/dictionaries/pl";
import ru from "../lib/i18n/dictionaries/ru";
import uk from "../lib/i18n/dictionaries/uk";
import tr from "../lib/i18n/dictionaries/tr";
import ar from "../lib/i18n/dictionaries/ar";
import he from "../lib/i18n/dictionaries/he";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const API_NEEDLES = ["/api/diagnose", "/api/scan/photo", "/api/vin/decode"];
const COMPETITORS = ["FIXD", "Carly", "TorqueBot", "CarMD", "AIMECH", "AI Mechanic"];

test("demo: canned only — no fetch, no API strings, no live calls in the demo components", () => {
  for (const rel of ["components/GuidedDemo.tsx", "components/HomeDemo.tsx", "app/demo/page.tsx"]) {
    const src = read(rel);
    assert.ok(!src.includes("fetch("), `${rel} never fetches`);
    for (const needle of API_NEEDLES) {
      assert.ok(!src.includes(needle), `${rel} never references ${needle}`);
    }
  }
  const demo = read("components/GuidedDemo.tsx");
  assert.ok(!demo.includes("OpenRouter") && !demo.includes("openrouter"), "no AI provider wiring in the demo");
});

test("demo: labeled a sample throughout, built from the real verified dashboard reading", () => {
  const demo = read("components/GuidedDemo.tsx");
  assert.ok(demo.includes("sampleLabel"), "the Sample chip renders from the catalog");
  assert.ok(demo.includes("sampleNote"), "the sample note renders from the catalog");
  // The five lights of the 2026-11-16 verified test, in order,
  // with the severities that test actually returned.
  const lights = [
    ["light1", "sevMinor"],
    ["light2", "sevCritical"],
    ["light3", "sevCritical"],
    ["light4", "sevModerate"],
    ["light5", "sevModerate"],
  ] as const;
  for (const [light, sev] of lights) {
    assert.ok(demo.includes(`${light}Name`), `demo renders ${light}Name`);
    assert.ok(demo.includes(`${light}Meaning`), `demo renders ${light}Meaning`);
    assert.ok(demo.includes(sev), `demo renders ${sev} for ${light}`);
  }
  assert.equal(en.demo.light2Name, "Battery / charging");
  assert.equal(en.demo.sevCritical, "Critical");
  // The walk ends at the account door — the demo never pretends
  // to run a real diagnosis.
  assert.ok(demo.includes('href="/register"'), "final step routes to account creation");
  assert.ok(demo.includes("step4Cta"), "final CTA comes from the catalog");
});

test("demo: reachable — /demo route exists, homepage section under the hero, hero text link", () => {
  const page = read("app/demo/page.tsx");
  assert.ok(page.includes("<GuidedDemo"), "the /demo route renders the guided demo");
  const home = read("components/HomeDemo.tsx");
  assert.ok(home.includes('href="/demo"'), "the homepage demo section links to /demo");
  assert.ok(home.includes("t.demo") && home.includes("d.title"), "the section headline comes from the catalog");
  const hero = read("components/Hero.tsx");
  assert.ok(hero.includes('href="/demo"'), "the hero carries the demo link");
  assert.ok(hero.includes("t.hero.demoCta"), "the hero demo link label comes from the catalog");
});

test("estimates explainer: describes only what the code does — no database, no stats, no competitors", () => {
  const explainer = read("components/EstimateExplainer.tsx");
  assert.ok(explainer.includes('id="how-estimates"'), "the section is the demo's link target");
  assert.ok(!explainer.includes("%"), "no percentage claims in the explainer");
  for (const name of COMPETITORS) {
    assert.ok(!explainer.includes(name), `no competitor named: ${name}`);
  }
  const body = en.estimates.body.toLowerCase();
  assert.ok(!body.includes("database"), "no pricing-database claim");
  assert.ok(!body.includes("%"), "no accuracy statistic");
  // The three true price movers are the section's three cards.
  for (const key of ["locationTitle", "vehicleTitle", "partsTitle"] as const) {
    assert.ok(explainer.includes(`e.${key}`), `explainer renders ${key}`);
    assert.ok(en.estimates[key].length > 0, `en.estimates.${key} exists`);
  }
  // The /diagnose page carries the explainer and the uncertainty
  // example (the fuller home for both).
  const routes = read("components/MarketingRoutes.tsx");
  assert.ok(routes.includes("<EstimateExplainer"), "/diagnose renders the explainer");
  assert.ok(routes.includes("<UncertaintyExample"), "/diagnose renders the uncertainty example");
});

test("quality evidence: uncertainty example is real; stories render only when real ones are passed", () => {
  const unc = read("components/UncertaintyExample.tsx");
  assert.ok(unc.includes("stories.length > 0"), "stories render only from a non-empty prop");
  assert.ok(unc.includes("stories = []"), "the default is zero stories — none invented");
  for (const name of COMPETITORS) {
    assert.ok(!unc.includes(name), `no competitor named: ${name}`);
  }
  // The example shows its work: three possible causes, one wide
  // range, and what would narrow it down.
  for (const key of ["cause1", "cause2", "cause3", "rangeValue", "helpsTitle", "help1", "help2", "help3"] as const) {
    assert.ok(unc.includes(`u.${key}`), `uncertainty example renders ${key}`);
  }
  assert.equal(en.uncertainty.rangeValue, "$150–$700");
});

test("quote language: the safer vocabulary in EN, old accusatory verdicts gone from every dictionary", () => {
  assert.equal(en.fairPrice.verdictWord, "Above the estimate range");
  assert.equal(en.fairPrice.lines.part.verdict, "Above the estimate range");
  assert.equal(en.fairPrice.lines.labor.verdict, "Within range");
  assert.equal(en.fairPrice.lines.supplies.verdict, "Ask the shop to explain");
  assert.ok(en.pillars.protect.point1.includes("within range"), "protect point1 uses the new vocabulary");
  assert.ok(en.pillars.protect.detail.includes("ask the shop to explain"), "protect detail uses the new vocabulary");
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
      assert.ok(!dict.includes(word), `${code} no longer carries the old verdict word: ${word}`);
    }
  }
});

test("human help: urgent + unsure cards route only to what exists — no hotline, no phone number", () => {
  const card = read("components/HumanHelpCard.tsx");
  assert.ok(card.includes('role={urgent ? "alert" : undefined}'), "the urgent card announces itself");
  assert.ok(card.includes('"/app/nearby"'), "in-app route is the existing nearby-shops page");
  assert.ok(card.includes('"/register"'), "public route is a free account, said plainly");
  assert.ok(!card.includes('href="tel:'), "the card never offers a call link");
  assert.ok(!/hotline/i.test(Object.values(en.help).join(" ")), "no user-facing help copy implies a hotline");
  assert.ok(!/\d{3}[-.]\d{3}[-.]\d{4}/.test(card), "no phone number is invented");
  assert.ok(en.help.urgentBody.includes("towed"), "urgent guidance is stop-and-tow, in words");
  // Wired into the surfaces: demo step 1 (urgent), the real
  // diagnose report (urgent on Critical / not safe to drive,
  // unsure when nothing came back likely), and the photo scan
  // (urgent on any Critical light).
  assert.ok(read("components/GuidedDemo.tsx").includes('variant="urgent"'), "demo shows the urgent card");
  const diag = read("app/app/diagnose/page.tsx");
  assert.ok(diag.includes("<HumanHelpCard"), "diagnose report renders the help card");
  assert.ok(diag.includes('report.severity === "Critical"'), "diagnose urgent trigger is the report severity");
  assert.ok(diag.includes("!report.safeToDriver"), "diagnose urgent trigger includes not-safe-to-drive");
  const scan = read("app/app/scan/page.tsx");
  assert.ok(scan.includes("<HumanHelpCard"), "photo scan renders the help card");
});

test("i18n: the new namespaces are fully translated in every growth locale", () => {
  const growth = { pt, de, it, pl, ru, uk, tr, ar, he } as const;
  const namespaces = ["demo", "estimates", "uncertainty", "help"] as const;
  for (const [code, dict] of Object.entries(growth)) {
    for (const ns of namespaces) {
      const enKeys = Object.keys(en[ns]);
      const own = (dict as Record<string, unknown>)[ns] as Record<string, unknown> | undefined;
      assert.ok(own, `${code} carries the ${ns} namespace`);
      for (const key of enKeys) {
        assert.equal(typeof own[key], "string", `${code}.${ns}.${key} is translated`);
        assert.ok((own[key] as string).length > 0, `${code}.${ns}.${key} is non-empty`);
      }
    }
    const hero = (dict as Record<string, unknown>)["hero"] as Record<string, unknown>;
    assert.equal(typeof hero["demoCta"], "string", `${code}.hero.demoCta is translated`);
    // The verdict word is the new vocabulary in this locale too.
    const fp = (dict as Record<string, unknown>)["fairPrice"] as Record<string, unknown>;
    const lines = fp["lines"] as Record<string, Record<string, unknown>>;
    assert.equal(fp["verdictWord"], lines["part"]["verdict"], `${code} verdictWord matches its part verdict`);
  }
});
