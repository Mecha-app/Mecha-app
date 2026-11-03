/** Shared i18n types (DESIGN_SYSTEM §2.2). */

export type DeepPartial<T> = T extends (infer U)[]
  ? U[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type LocaleCode = "en" | "es" | "fr" | "ht";

export interface LocaleMeta {
  code: LocaleCode;
  /** Endonym — the language's own name, shown in the switcher. */
  label: string;
  dir: "ltr" | "rtl";
  /**
   * Font loading note (§1.3): launch locales are Latin-script and render in
   * Space Grotesk / Inter. Growth locales load Noto per-locale, never
   * globally: Arabic/Hebrew/Devanagari → Noto Sans (script build);
   * CJK → Noto Sans SC/TC/JP/KR; display headlines in fallback locales
   * render in Noto Sans with tightened tracking.
   */
  fontNote: string;
}

export const LOCALES: LocaleMeta[] = [
  { code: "en", label: "English", dir: "ltr", fontNote: "Space Grotesk / Inter native." },
  { code: "es", label: "Español", dir: "ltr", fontNote: "Space Grotesk / Inter (Latin Extended)." },
  { code: "fr", label: "Français", dir: "ltr", fontNote: "Space Grotesk / Inter (Latin Extended)." },
  { code: "ht", label: "Kreyòl", dir: "ltr", fontNote: "Space Grotesk / Inter (Latin Extended)." },
];

export const DEFAULT_LOCALE: LocaleCode = "en";
export const LOCALE_STORAGE_KEY = "mecha-locale";

export function isLocaleCode(value: string | null | undefined): value is LocaleCode {
  return value === "en" || value === "es" || value === "fr" || value === "ht";
}

export function localeMeta(code: LocaleCode): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
