import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
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
 * Type system (DESIGN_SYSTEM §1.3), wired via next/font (self-hosted at
 * build, OFL-licensed):
 *  - Space Grotesk — display: headlines, prices, gauge numerals.
 *  - Inter — text/UI: tabular figures, small-size legibility.
 *  - IBM Plex Mono — data only: VINs, fault codes, odometer readings.
 * Per-locale Noto (§1.3) is loaded per-locale at WP7, never globally; the
 * --font-noto-* fallbacks are already slotted into the Tailwind stacks and
 * globals.css, so growth locales (Arabic/Hebrew/Devanagari/CJK) render in
 * Noto Sans / Noto Sans SC·TC·JP·KR instead of tofu.
 */
const display = Space_Grotesk({
  // Space Grotesk ships no Cyrillic subset — Cyrillic display text falls
  // back through the stack to Inter (Cyrillic loaded below) / Noto.
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

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
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
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
