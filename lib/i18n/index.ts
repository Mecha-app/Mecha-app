import en, { type Dictionary } from "./dictionaries/en";
import es from "./dictionaries/es";
import fr from "./dictionaries/fr";
import ht from "./dictionaries/ht";
import type { DeepPartial, LocaleCode } from "./types";

export type { Dictionary };
export * from "./types";

/**
 * Catalog resolution (§2.2): EN is the source of truth. Launch locales ship
 * complete homepage catalogs in WP2; any key a locale hasn't translated yet
 * falls back to EN at runtime — a fallback, never a blank string.
 * WP2 scope: homepage (marketing `/`) strings. App-route catalogs are
 * structured identically and land with WP5/WP7.
 */
const PARTIALS: Record<LocaleCode, DeepPartial<Dictionary>> = {
  en: {},
  es,
  fr,
  ht,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, override: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : (override as T)) ?? base;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(override as Record<string, unknown>)) {
    const o = (override as Record<string, unknown>)[key];
    const b = (base as Record<string, unknown>)[key];
    out[key] = isPlainObject(b) && isPlainObject(o) ? deepMerge(b, o) : o === undefined ? b : o;
  }
  return out as T;
}

const CACHE = new Map<LocaleCode, Dictionary>();

export function getDictionary(locale: LocaleCode): Dictionary {
  const hit = CACHE.get(locale);
  if (hit) return hit;
  const dict = locale === "en" ? en : deepMerge(en, PARTIALS[locale]);
  CACHE.set(locale, dict);
  return dict;
}
