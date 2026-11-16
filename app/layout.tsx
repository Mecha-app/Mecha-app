import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ThemeScript } from "@/components/ThemeScript";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getDictionary,
  isLocaleCode,
  localeMeta,
} from "@/lib/i18n";
import "./globals.css";

/**
 * Type system (DESIGN_SYSTEM §1.3) — SELF-HOSTED via @fontsource (OFL):
 *  - Space Grotesk — display: headlines, prices, gauge numerals.
 *  - Inter — text/UI: tabular figures, small-size legibility.
 *  - IBM Plex Mono — data only: VINs, fault codes, odometer readings.
 *
 * WHY NOT next/font/google: it fetches font files from Google at BUILD
 * time. That fetch fails in Vercel's build environment — first failing
 * commit ee34e1b (the locales package's Inter cyrillic subsets), error
 * "layout.tsx:12:1 Type error: Cannot read properties of undefined
 * (reading '0')" → "npm run build exited with 1" on BOTH ee34e1b and
 * f217942, while local builds passed. @fontsource ships the woff2 files
 * inside npm packages, so `npm ci` is the only network step and the
 * build itself makes ZERO Google Fonts requests.
 *
 * The @font-face rules below carry font-display: swap and the real
 * family names; globals.css binds them to the design contract variables
 * --font-display / --font-sans / --font-mono consumed by Tailwind.
 * Space Grotesk ships no Cyrillic subset — Cyrillic display text falls
 * back through the stack to Inter (Cyrillic loaded below) / Noto.
 * Per-locale Noto (§1.3) is loaded per-locale at WP7, never globally; the
 * --font-noto-* fallbacks are already slotted into the Tailwind stacks
 * and globals.css, so growth locales (Arabic/Hebrew/Devanagari/CJK)
 * render in Noto Sans / Noto Sans SC·TC·JP·KR instead of tofu.
 */
/* Space Grotesk — display, 500/600/700, latin + latin-ext */
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/space-grotesk/latin-ext-500.css";
import "@fontsource/space-grotesk/latin-ext-600.css";
import "@fontsource/space-grotesk/latin-ext-700.css";
/* Inter — text/UI, 400/500/600, latin + latin-ext + cyrillic + cyrillic-ext */
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/inter/cyrillic-400.css";
import "@fontsource/inter/cyrillic-500.css";
import "@fontsource/inter/cyrillic-600.css";
import "@fontsource/inter/cyrillic-ext-400.css";
import "@fontsource/inter/cyrillic-ext-500.css";
import "@fontsource/inter/cyrillic-ext-600.css";
/* IBM Plex Mono — data, 400/500, latin + latin-ext */
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-ext-400.css";
import "@fontsource/ibm-plex-mono/latin-ext-500.css";

const en = getDictionary("en");

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The locale cookie (written by LocaleProvider on every switch) lets the
  // served HTML carry the right lang + dir on first paint — dir="rtl" for
  // AR/HE instead of an LTR flash corrected only after hydration.
  const cookieLocale = (await cookies()).get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleCode(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  return (
    <html
      lang={locale}
      dir={localeMeta(locale).dir}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
