import type { CapacitorConfig } from "@capacitor/cli";

/**
 * MECHA native shell (app-conversion prep, 2026-11-18) — Capacitor
 * wraps the LIVE site: the shell loads https://mechatech.io and adds
 * the native layer (splash, status bar, camera, share sheet, Android
 * back button) through lib/client/nativeShell.ts +
 * components/NativeShell.tsx. The website itself is unchanged — every
 * native behavior is feature-detected and no-ops in a browser.
 *
 * appId: io.mechatech.app — SUGGESTED, changeable ONLY before store
 * enrollment; it can never change afterwards (see
 * ~/workspace/mechaapp/app-store/GO_LIVE_CHECKLIST.md step 1).
 *
 * webDir ("shell-www") is NOT the app — it holds one offline fallback
 * page shown only if the device cannot reach the site at cold start.
 *
 * Navigation contract: the webview may navigate freely inside
 * mechatech.io. Stripe checkout is a top-level redirect OUT to
 * checkout.stripe.com and back (the WP6 flow) — those hosts are
 * allow-listed so the round trip stays in the shell; everything else
 * external (tel:, maps, third-party pages) is handed to the system by
 * NativeShell instead of loading inside the app.
 */
const config: CapacitorConfig = {
  appId: "io.mechatech.app",
  appName: "MECHA",
  webDir: "shell-www",
  server: {
    url: "https://mechatech.io",
    cleartext: false,
    allowNavigation: [
      "mechatech.io",
      "checkout.stripe.com",
      "js.stripe.com",
      "hooks.stripe.com",
    ],
  },
  ios: {
    // Safe areas: the webview extends under the notch / home indicator
    // and the site's own CSS (env(safe-area-inset-*), viewport-fit=cover)
    // owns the padding — the shell never letterboxes the app.
    contentInset: "never",
    backgroundColor: "#ffffff",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#ffffff",
    // Mixed content stays off: the app is HTTPS end to end.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // The shell shows the brand splash only until the site reports
      // ready (NativeShell hides it on first mount); the cap keeps a
      // dead connection from trapping the user on the splash — the
      // offline fallback page takes over instead.
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    StatusBar: {
      // White bar, dark text — the site's approved white header
      // continues straight into the system chrome. Brand accent
      // #2563eb lives in the header itself, not the bar.
      style: "LIGHT",
      backgroundColor: "#ffffff",
      overlaysWebView: false,
    },
  },
};

export default config;
