"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const i18n_1 = require("../lib/i18n");
const en_1 = __importDefault(require("../lib/i18n/dictionaries/en"));
const es_1 = __importDefault(require("../lib/i18n/dictionaries/es"));
const fr_1 = __importDefault(require("../lib/i18n/dictionaries/fr"));
const ht_1 = __importDefault(require("../lib/i18n/dictionaries/ht"));
const pt_1 = __importDefault(require("../lib/i18n/dictionaries/pt"));
const de_1 = __importDefault(require("../lib/i18n/dictionaries/de"));
const it_1 = __importDefault(require("../lib/i18n/dictionaries/it"));
const pl_1 = __importDefault(require("../lib/i18n/dictionaries/pl"));
const ru_1 = __importDefault(require("../lib/i18n/dictionaries/ru"));
const uk_1 = __importDefault(require("../lib/i18n/dictionaries/uk"));
const tr_1 = __importDefault(require("../lib/i18n/dictionaries/tr"));
const ar_1 = __importDefault(require("../lib/i18n/dictionaries/ar"));
const he_1 = __importDefault(require("../lib/i18n/dictionaries/he"));
/** Flatten a catalog into dot-path -> leaf (string | string[]). */
function units(node, prefix = "", out = new Map()) {
    if (typeof node === "string" || Array.isArray(node)) {
        out.set(prefix, node);
        return out;
    }
    if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
            units(v, prefix ? `${prefix}.${k}` : k, out);
        }
    }
    return out;
}
function getPath(node, path) {
    return path.split(".").reduce((acc, seg) => {
        if (acc && typeof acc === "object")
            return acc[seg];
        return undefined;
    }, node);
}
const EN_UNITS = units(en_1.default);
const PARTIALS = {
    es: es_1.default, fr: fr_1.default, ht: ht_1.default, pt: pt_1.default, de: de_1.default, it: it_1.default, pl: pl_1.default, ru: ru_1.default, uk: uk_1.default, tr: tr_1.default, ar: ar_1.default, he: he_1.default,
};
const GROWTH = ["pt", "de", "it", "pl", "ru", "uk", "tr", "ar", "he"];
(0, node_test_1.test)("registry: exactly the owner's 13 v1 locales, endonym labels, AR/HE rtl", () => {
    strict_1.default.equal(i18n_1.LOCALES.length, 13);
    strict_1.default.deepEqual(i18n_1.LOCALES.map((l) => l.code), ["en", "es", "fr", "ht", "pt", "de", "it", "pl", "ru", "uk", "tr", "ar", "he"]);
    for (const meta of i18n_1.LOCALES) {
        strict_1.default.ok((0, i18n_1.isLocaleCode)(meta.code), `${meta.code} passes isLocaleCode`);
        strict_1.default.ok(meta.label.length > 0, `${meta.code} has an endonym label`);
        const expectRtl = meta.code === "ar" || meta.code === "he";
        strict_1.default.equal(meta.dir, expectRtl ? "rtl" : "ltr", `${meta.code} dir`);
        strict_1.default.equal((0, i18n_1.localeMeta)(meta.code).label, meta.label);
    }
    strict_1.default.equal((0, i18n_1.isLocaleCode)("xx"), false);
    strict_1.default.equal((0, i18n_1.isLocaleCode)(null), false);
    // Endonyms are the language's own name, not the English name.
    strict_1.default.equal((0, i18n_1.localeMeta)("pt").label, "Português");
    strict_1.default.equal((0, i18n_1.localeMeta)("de").label, "Deutsch");
    strict_1.default.equal((0, i18n_1.localeMeta)("ru").label, "Русский");
    strict_1.default.equal((0, i18n_1.localeMeta)("uk").label, "Українська");
    strict_1.default.equal((0, i18n_1.localeMeta)("ar").label, "العربية");
    strict_1.default.equal((0, i18n_1.localeMeta)("he").label, "עברית");
});
(0, node_test_1.test)("parity: every registered locale resolves every EN key, non-empty", () => {
    for (const meta of i18n_1.LOCALES) {
        const dict = (0, i18n_1.getDictionary)(meta.code);
        for (const [path, enValue] of EN_UNITS) {
            const resolved = getPath(dict, path);
            if (Array.isArray(enValue)) {
                strict_1.default.ok(Array.isArray(resolved) && resolved.length === enValue.length, `${meta.code}: ${path} resolves to a ${enValue.length}-item list`);
                for (const item of resolved) {
                    strict_1.default.ok(typeof item === "string" && item.length > 0, `${meta.code}: ${path} item non-empty`);
                }
            }
            else {
                strict_1.default.ok(typeof resolved === "string" && resolved.length > 0, `${meta.code}: ${path} resolves to a non-empty string`);
            }
        }
    }
});
(0, node_test_1.test)("growth locales: complete own catalogs (100% of EN units translated)", () => {
    for (const code of GROWTH) {
        const own = units(PARTIALS[code]);
        strict_1.default.equal(own.size, EN_UNITS.size, `${code} translates all ${EN_UNITS.size} EN units`);
        for (const path of EN_UNITS.keys()) {
            strict_1.default.ok(own.has(path), `${code} has its own translation for ${path}`);
        }
    }
});
(0, node_test_1.test)("translated % per locale (reported in STATUS; fallback is resolution, not translation)", () => {
    const report = { en: 100 };
    for (const [code, partial] of Object.entries(PARTIALS)) {
        const own = units(partial);
        report[code] = Math.round((own.size / EN_UNITS.size) * 1000) / 10;
        // Launch locales cover at least the marketing + scan scope.
        strict_1.default.ok(own.size >= 260, `${code} covers at least the launch scope (saw ${own.size})`);
    }
    // The numbers STATUS.md publishes — keep them honest if a catalog moves.
    strict_1.default.equal(report.pt, 100);
    strict_1.default.equal(report.ar, 100);
    strict_1.default.equal(report.he, 100);
    console.log("translated % per locale:", JSON.stringify(report));
});
(0, node_test_1.test)("spot content: verdict words and plan names follow the ES/FR pattern in growth locales", () => {
    // Verdict words are translated (never left as raw EN product terms)…
    strict_1.default.equal(getPath((0, i18n_1.getDictionary)("de"), "fairPrice.verdictWord"), "Über dem Schätzbereich");
    strict_1.default.equal(getPath((0, i18n_1.getDictionary)("ar"), "fairPrice.verdictWord"), "أعلى من نطاق التقدير");
    strict_1.default.equal(getPath((0, i18n_1.getDictionary)("he"), "fairPrice.verdictWord"), "מעל טווח ההערכה");
    // …while brand/plan names stay MECHA / Pro / Business in every locale.
    for (const code of GROWTH) {
        const dict = (0, i18n_1.getDictionary)(code);
        strict_1.default.equal(getPath(dict, "pricing.pro.name"), "Pro", `${code} keeps Pro`);
        strict_1.default.equal(getPath(dict, "wp6.billing.planPro"), "MECHA Pro", `${code} keeps MECHA Pro`);
    }
});
