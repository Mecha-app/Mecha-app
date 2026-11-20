import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { CookieConsent } from "@/components/CookieConsent";
import NativeShell from "@/components/NativeShell";
import { PwaInstall } from "@/components/PwaInstall";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeScript } from "@/components/ThemeScript";
import { analyticsConfig } from "@/lib/analytics";
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

// Search Console ownership (analytics pass, 2026-11-18): the
// verification meta renders only when NEXT_PUBLIC_GSC_VERIFICATION
// holds the token from the Search Console console — unset, and no
// meta ships. Same env gate as the scripts (lib/analytics).
const gscToken = analyticsConfig().gscToken;

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
  verification: gscToken ? { google: gscToken } : undefined,
  // Install polish (app-conversion prep, 2026-11-18) — additive only:
  // the PWA manifest + touch icon let the site install like an app on
  // both platforms ahead of the store builds, and appleWebApp asks
  // iOS for the standalone chrome when it does.
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "MECHA", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Brand accent tints the browser / installed-app chrome.
  themeColor: "#2563eb",
  // The native shell and notched phones own the safe areas; the site
  // pads with env(safe-area-inset-*) where it matters.
  viewportFit: "cover",
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
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        {/* iOS standalone chrome (PWA install pass, 2026-11-20):
            Next renders appleWebApp.capable under the standard
            mobile-web-app-capable name; Safari still keys on the
            apple-prefixed tag, so it ships explicitly here. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <LocaleProvider>
          {children}
          {/* Cookie consent bar (2026-11-19): renders only when the
              visitor has not chosen yet (or re-opens from the
              footer's Cookie settings link). Inside the provider so
              its strings follow the reader's language. */}
          <CookieConsent />
          {/* Home-screen install hint (PWA install pass, 2026-11-20):
              a slim bottom bar for engaged mobile visitors who can
              add MECHA to their home screen — Android gets the real
              install prompt, iOS Safari gets the Share → Add to
              Home Screen line. Gated inside the component (second
              view, consent settled, dismissal cooldown); renders
              nothing otherwise. */}
          <PwaInstall />
        </LocaleProvider>
        {/* Consent-gated analytics mount (2026-11-19): renders the
            client gate only when the env carries analytics ids; the
            gate loads GA/Clarity after the visitor accepts in the
            banner — never before, never on Decline. */}
        <AnalyticsScripts />
        {/* No-ops in a browser; wires the Capacitor shell's native
            behaviors (status bar, splash, back button, external
            links) when the site runs inside the app. */}
        <NativeShell />
        {/* PWA service worker (install support + static icon cache
            only — public/sw.js never intercepts /api, auth, or
            pages). Production browser only; inert in the shell. */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
