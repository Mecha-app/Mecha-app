import { DEFAULT_LOCALE, isLocaleCode, type LocaleCode } from "./types";

/**
 * Locale links (localized-landing pass, 2026-11-19): outreach emails
 * carry the reader's language in the URL — e.g.
 * https://mechatech.io/shops?lang=es — and the site opens in that
 * language. The LocaleProvider resolves the parameter ONCE on mount,
 * ahead of the saved choice: an explicit link chosen for this reader
 * beats whatever a previous visit left behind. Once applied, the
 * locale persists exactly like a switcher pick (localStorage + the
 * SSR lang/dir cookie), so later pages and later visits stay in the
 * language without the parameter having to ride along.
 *
 * Only the registered codes are honored, spelled exactly as in the
 * registry (lowercase). Anything else — "en-US", "ES", junk — is
 * ignored, and the normal saved/default resolution runs.
 */
export const LANG_PARAM = "lang";

/** The locale a `?lang=` link asks for, or null when it asks for nothing valid. */
export function parseLangParam(search: string): LocaleCode | null {
  let value: string | null = null;
  try {
    value = new URLSearchParams(search).get(LANG_PARAM);
  } catch {
    return null;
  }
  return isLocaleCode(value) ? value : null;
}

/**
 * Initial-locale precedence: an explicit locale link wins; then the
 * saved switcher choice; then the default. Pure so the rule is
 * testable without a DOM.
 */
export function resolveInitialLocale(
  link: LocaleCode | null,
  saved: string | null | undefined,
): LocaleCode {
  if (link) return link;
  return isLocaleCode(saved) ? saved : DEFAULT_LOCALE;
}
