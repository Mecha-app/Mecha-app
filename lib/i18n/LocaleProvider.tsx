"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getDictionary,
  localeMeta,
  type Dictionary,
  type LocaleCode,
} from "./index";
import { parseLangParam, resolveInitialLocale } from "./localeLink";

/**
 * Mirror the locale into a cookie so the server-rendered <html lang dir>
 * (app/layout.tsx) matches the visitor's choice on first paint — RTL
 * locales (AR/HE) get dir="rtl" in the served HTML, not only after the
 * client effect runs. localStorage stays the client source of truth.
 */
function syncLocaleCookie(code: LocaleCode) {
  try {
    document.cookie = `${LOCALE_STORAGE_KEY}=${code}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
}

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: getDictionary(DEFAULT_LOCALE),
});

/**
 * Locale state for the app (§2.2): switcher in the header, persisted to
 * localStorage for visitors (account preference for signed-in users lands
 * in WP3). Sets <html lang> + dir on change — logical CSS properties only,
 * so RTL growth locales mirror without new layout code.
 *
 * Initial resolution (localized-landing pass, 2026-11-19): a `?lang=`
 * locale link — the form outreach emails use, e.g. /shops?lang=es —
 * wins over the saved choice, because the sender picked that language
 * for this reader; the applied locale then persists exactly like a
 * switcher pick. Without a link, the saved choice wins, then EN.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      /* private mode — session-only locale */
    }
    const link = parseLangParam(window.location.search);
    const initial = resolveInitialLocale(link, saved);
    setLocaleState(initial);
    syncLocaleCookie(initial);
    if (link) {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, initial);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const meta = localeMeta(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
  }, [locale]);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    syncLocaleCookie(code);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: getDictionary(locale) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
