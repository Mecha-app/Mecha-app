/**
 * Locales completion tests — 13 v1 locales + RTL (owner's list:
 * EN/ES/FR/HT + PT/DE/IT/PL/RU/UK/TR/AR/HE).
 *
 * Pinned rules:
 *   - every registered locale RESOLVES every EN key through
 *     getDictionary() (per-key EN fallback counts as resolved, never a
 *     blank string) — a locale never ships a hole;
 *   - the 9 growth locales carry a COMPLETE own catalog (654/654 EN
 *     units translated — the full catalog: marketing incl. the
 *     diagnose/pricing/shops pages, scan, and the WP6 app catalog) —
 *     they went live only when complete, per the owner's "never
 *     advertise a language the app can't speak" rule;
 *   - ES/FR/HT resolve fully via fallback; their own catalogs cover the
 *     marketing + scan scope and their WP6 strings fall back to EN by
 *     design (percentages reported in STATUS.md);
 *   - AR + HE are the only RTL locales; the switcher labels every locale
 *     in its own language.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { LOCALES, getDictionary, isLocaleCode, localeMeta } from "../lib/i18n";
import en from "../lib/i18n/dictionaries/en";
import es from "../lib/i18n/dictionaries/es";
import fr from "../lib/i18n/dictionaries/fr";
import ht from "../lib/i18n/dictionaries/ht";
import pt from "../lib/i18n/dictionaries/pt";
import de from "../lib/i18n/dictionaries/de";
import it from "../lib/i18n/dictionaries/it";
import pl from "../lib/i18n/dictionaries/pl";
import ru from "../lib/i18n/dictionaries/ru";
import uk from "../lib/i18n/dictionaries/uk";
import tr from "../lib/i18n/dictionaries/tr";
import ar from "../lib/i18n/dictionaries/ar";
import he from "../lib/i18n/dictionaries/he";
import type { DeepPartial, Dictionary, LocaleCode } from "../lib/i18n";

/** Flatten a catalog into dot-path -> leaf (string | string[]). */
function units(node: unknown, prefix = "", out = new Map<string, string | string[]>()) {
  if (typeof node === "string" || Array.isArray(node)) {
    out.set(prefix, node as string | string[]);
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      units(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
  return out;
}

function getPath(node: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, seg) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[seg];
    return undefined;
  }, node);
}

const EN_UNITS = units(en);
const PARTIALS: Record<string, DeepPartial<Dictionary>> = {
  es, fr, ht, pt, de, it, pl, ru, uk, tr, ar, he,
};
const GROWTH: LocaleCode[] = ["pt", "de", "it", "pl", "ru", "uk", "tr", "ar", "he"];

test("registry: exactly the owner's 13 v1 locales, endonym labels, AR/HE rtl", () => {
  assert.equal(LOCALES.length, 13);
  assert.deepEqual(
    LOCALES.map((l) => l.code),
    ["en", "es", "fr", "ht", "pt", "de", "it", "pl", "ru", "uk", "tr", "ar", "he"],
  );
  for (const meta of LOCALES) {
    assert.ok(isLocaleCode(meta.code), `${meta.code} passes isLocaleCode`);
    assert.ok(meta.label.length > 0, `${meta.code} has an endonym label`);
    const expectRtl = meta.code === "ar" || meta.code === "he";
    assert.equal(meta.dir, expectRtl ? "rtl" : "ltr", `${meta.code} dir`);
    assert.equal(localeMeta(meta.code).label, meta.label);
  }
  assert.equal(isLocaleCode("xx"), false);
  assert.equal(isLocaleCode(null), false);
  // Endonyms are the language's own name, not the English name.
  assert.equal(localeMeta("pt").label, "Português");
  assert.equal(localeMeta("de").label, "Deutsch");
  assert.equal(localeMeta("ru").label, "Русский");
  assert.equal(localeMeta("uk").label, "Українська");
  assert.equal(localeMeta("ar").label, "العربية");
  assert.equal(localeMeta("he").label, "עברית");
});

test("parity: every registered locale resolves every EN key, non-empty", () => {
  for (const meta of LOCALES) {
    const dict = getDictionary(meta.code);
    for (const [path, enValue] of EN_UNITS) {
      const resolved = getPath(dict, path);
      if (Array.isArray(enValue)) {
        assert.ok(
          Array.isArray(resolved) && resolved.length === enValue.length,
          `${meta.code}: ${path} resolves to a ${enValue.length}-item list`,
        );
        for (const item of resolved as string[]) {
          assert.ok(typeof item === "string" && item.length > 0, `${meta.code}: ${path} item non-empty`);
        }
      } else {
        assert.ok(
          typeof resolved === "string" && resolved.length > 0,
          `${meta.code}: ${path} resolves to a non-empty string`,
        );
      }
    }
  }
});

test("growth locales: complete own catalogs (100% of EN units translated)", () => {
  for (const code of GROWTH) {
    const own = units(PARTIALS[code]);
    assert.equal(own.size, EN_UNITS.size, `${code} translates all ${EN_UNITS.size} EN units`);
    for (const path of EN_UNITS.keys()) {
      assert.ok(own.has(path), `${code} has its own translation for ${path}`);
    }
  }
});

test("translated % per locale (reported in STATUS; fallback is resolution, not translation)", () => {
  const report: Record<string, number> = { en: 100 };
  for (const [code, partial] of Object.entries(PARTIALS)) {
    const own = units(partial);
    report[code] = Math.round((own.size / EN_UNITS.size) * 1000) / 10;
    // Launch locales cover at least the marketing + scan scope.
    assert.ok(own.size >= 260, `${code} covers at least the launch scope (saw ${own.size})`);
  }
  // The numbers STATUS.md publishes — keep them honest if a catalog moves.
  assert.equal(report.pt, 100);
  assert.equal(report.ar, 100);
  assert.equal(report.he, 100);
  console.log("translated % per locale:", JSON.stringify(report));
});

test("spot content: verdict words and plan names follow the ES/FR pattern in growth locales", () => {
  // Verdict words are translated (never left as raw EN product terms)…
  assert.equal(getPath(getDictionary("de"), "fairPrice.verdictWord"), "Hoch");
  assert.equal(getPath(getDictionary("ar"), "fairPrice.verdictWord"), "مرتفع");
  assert.equal(getPath(getDictionary("he"), "fairPrice.verdictWord"), "יקר");
  // …while brand/plan names stay MECHA / Pro / Business in every locale.
  for (const code of GROWTH) {
    const dict = getDictionary(code);
    assert.equal(getPath(dict, "pricing.pro.name"), "Pro", `${code} keeps Pro`);
    assert.equal(getPath(dict, "wp6.billing.planPro"), "MECHA Pro", `${code} keeps MECHA Pro`);
  }
});
