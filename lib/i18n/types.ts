/** Shared i18n types (DESIGN_SYSTEM §2.2). */

export type DeepPartial<T> = T extends (infer U)[]
  ? U[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type LocaleCode =
  | "en"
  | "es"
  | "fr"
  | "ht"
  | "pt"
  | "de"
  | "it"
  | "pl"
  | "ru"
  | "uk"
  | "tr"
  | "ar"
  | "he";

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
  { code: "pt", label: "Português", dir: "ltr", fontNote: "Space Grotesk / Inter (Latin Extended)." },
  { code: "de", label: "Deutsch", dir: "ltr", fontNote: "Space Grotesk / Inter (Latin Extended)." },
  { code: "it", label: "Italiano", dir: "ltr", fontNote: "Space Grotesk / Inter (Latin Extended)." },
  { code: "pl", label: "Polski", dir: "ltr", fontNote: "Space Grotesk / Inter (Latin Extended)." },
  { code: "ru", label: "Русский", dir: "ltr", fontNote: "Inter (Cyrillic subsets loaded in layout); display headlines fall back to Inter/Noto — Space Grotesk has no Cyrillic subset." },
  { code: "uk", label: "Українська", dir: "ltr", fontNote: "Inter (Cyrillic subsets loaded in layout); display headlines fall back to Inter/Noto — Space Grotesk has no Cyrillic subset." },
  { code: "tr", label: "Türkçe", dir: "ltr", fontNote: "Space Grotesk / Inter (Latin Extended)." },
  { code: "ar", label: "العربية", dir: "rtl", fontNote: "Noto Sans (Arabic) slotted in the Tailwind stacks per §1.3; loaded per-locale, never globally." },
  { code: "he", label: "עברית", dir: "rtl", fontNote: "Noto Sans (Hebrew) slotted in the Tailwind stacks per §1.3; loaded per-locale, never globally." },
];

export const DEFAULT_LOCALE: LocaleCode = "en";
export const LOCALE_STORAGE_KEY = "mecha-locale";

export function isLocaleCode(value: string | null | undefined): value is LocaleCode {
  return LOCALES.some((l) => l.code === value);
}

export function localeMeta(code: LocaleCode): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
