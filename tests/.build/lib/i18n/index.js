"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDictionary = getDictionary;
const en_1 = __importDefault(require("./dictionaries/en"));
const es_1 = __importDefault(require("./dictionaries/es"));
const fr_1 = __importDefault(require("./dictionaries/fr"));
const ht_1 = __importDefault(require("./dictionaries/ht"));
const pt_1 = __importDefault(require("./dictionaries/pt"));
const de_1 = __importDefault(require("./dictionaries/de"));
const it_1 = __importDefault(require("./dictionaries/it"));
const pl_1 = __importDefault(require("./dictionaries/pl"));
const ru_1 = __importDefault(require("./dictionaries/ru"));
const uk_1 = __importDefault(require("./dictionaries/uk"));
const tr_1 = __importDefault(require("./dictionaries/tr"));
const ar_1 = __importDefault(require("./dictionaries/ar"));
const he_1 = __importDefault(require("./dictionaries/he"));
__exportStar(require("./types"), exports);
/**
 * Catalog resolution (§2.2): EN is the source of truth. All 13 v1 locales
 * are registered; any key a locale hasn't translated yet falls back to EN
 * at runtime — a fallback, never a blank string. The 9 growth locales
 * (PT/DE/IT/PL/RU/UK/TR/AR/HE) ship the complete catalog (marketing, scan,
 * WP6 app + billing). ES/FR/HT ship the complete marketing + scan catalog;
 * their WP6 app strings fall back to EN by design (see STATUS coverage
 * table; tests/i18n.test.ts pins the per-locale translated %).
 */
const PARTIALS = {
    en: {},
    es: es_1.default,
    fr: fr_1.default,
    ht: ht_1.default,
    pt: pt_1.default,
    de: de_1.default,
    it: it_1.default,
    pl: pl_1.default,
    ru: ru_1.default,
    uk: uk_1.default,
    tr: tr_1.default,
    ar: ar_1.default,
    he: he_1.default,
};
function isPlainObject(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
function deepMerge(base, override) {
    if (!isPlainObject(base) || !isPlainObject(override)) {
        return (override === undefined ? base : override) ?? base;
    }
    const out = { ...base };
    for (const key of Object.keys(override)) {
        const o = override[key];
        const b = base[key];
        out[key] = isPlainObject(b) && isPlainObject(o) ? deepMerge(b, o) : o === undefined ? b : o;
    }
    return out;
}
const CACHE = new Map();
function getDictionary(locale) {
    const hit = CACHE.get(locale);
    if (hit)
        return hit;
    const dict = locale === "en" ? en_1.default : deepMerge(en_1.default, PARTIALS[locale]);
    CACHE.set(locale, dict);
    return dict;
}
