"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Globe icon — MECHA line-icon set (§1.6), 1.75px stroke. */
function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z" />
    </svg>
  );
}

/**
 * Language switcher (owner hard requirement — full app language switching).
 * Launch locales EN/ES/FR/HT; the catalog framework (§2.2) makes locale #5+
 * a translation delivery, not an engineering project. The site states the
 * TRUE supported count — four at launch, growing honestly.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const current = LOCALES.find((l) => l.code === locale);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.header.languageLabel}
        className="inline-flex h-12 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-2 transition-colors duration-200 hover:text-ink-1 hover:border-ink-3"
      >
        <GlobeIcon />
        <span className="hidden sm:inline">{current?.label}</span>
        <span className="sm:hidden uppercase">{locale}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t.header.languageLabel}
          className="absolute end-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-line bg-raised py-1 shadow-none"
        >
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === locale}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                className={`flex min-h-[48px] w-full items-center justify-between px-3 py-3 text-start text-sm transition-colors duration-150 hover:bg-inset ${
                  l.code === locale ? "text-accent" : "text-ink-2"
                }`}
              >
                <span>{l.label}</span>
                <span className="font-mono text-[11px] uppercase text-ink-3">{l.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
