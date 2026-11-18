"use strict";
/** Shared i18n types (DESIGN_SYSTEM §2.2). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCALE_STORAGE_KEY = exports.DEFAULT_LOCALE = exports.LOCALES = void 0;
exports.isLocaleCode = isLocaleCode;
exports.localeMeta = localeMeta;
exports.LOCALES = [
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
exports.DEFAULT_LOCALE = "en";
exports.LOCALE_STORAGE_KEY = "mecha-locale";
function isLocaleCode(value) {
    return exports.LOCALES.some((l) => l.code === value);
}
function localeMeta(code) {
    return exports.LOCALES.find((l) => l.code === code) ?? exports.LOCALES[0];
}
