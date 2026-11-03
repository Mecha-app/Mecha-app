import en, { type Dictionary } from "./dictionaries/en";
import es from "./dictionaries/es";
import fr from "./dictionaries/fr";
import ht from "./dictionaries/ht";
import pt from "./dictionaries/pt";
import de from "./dictionaries/de";
import it from "./dictionaries/it";
import pl from "./dictionaries/pl";
import ru from "./dictionaries/ru";
import uk from "./dictionaries/uk";
import tr from "./dictionaries/tr";
import ar from "./dictionaries/ar";
import he from "./dictionaries/he";
import type { DeepPartial, LocaleCode } from "./types";

export type { Dictionary };
export * from "./types";

/**
 * Catalog resolution (§2.2): EN is the source of truth. All 13 v1 locales
 * are registered; any key a locale hasn't translated yet falls back to EN
 * at runtime — a fallback, never a blank string. The 9 growth locales
 * (PT/DE/IT/PL/RU/UK/TR/AR/HE) ship the complete catalog (marketing, scan,
 * WP6 app + billing). ES/FR/HT ship the complete marketing + scan catalog;
 * their WP6 app strings fall back to EN by design (see STATUS coverage
 * table; tests/i18n.test.ts pins the per-locale translated %).
 */
const PARTIALS: Record<LocaleCode, DeepPartial<Dictionary>> = {
  en: {},
  es,
  fr,
  ht,
  pt,
  de,
  it,
  pl,
  ru,
  uk,
  tr,
  ar,
  he,
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
