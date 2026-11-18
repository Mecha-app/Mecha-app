"use client";

import { useEffect } from "react";
import { isNativeShell } from "@/lib/client/nativeShell";

/**
 * Native shell bootstrap (app-conversion prep, 2026-11-18) — mounted
 * once by the root layout. In a browser it renders nothing and does
 * nothing (the guard is the first line of the effect). In the
 * Capacitor shell it wires the native behaviors the config promises:
 *
 *  - Status bar: white bar, dark text — the site's white header
 *    continues into the system chrome (config sets the same values
 *    for first paint; this keeps them after navigation).
 *  - Splash: hidden as soon as the real page has mounted.
 *  - Android hardware back: history back when there is history;
 *    at a root screen the app minimizes instead of trapping the user
 *    or dumping them out mid-task.
 *  - External links: cross-origin web links (parts retailers and the
 *    like) open in the in-app browser sheet — never by navigating
 *    the app itself away — and tel:/mailto:/sms: hand off to the OS.
 *    Same-origin links and the allow-listed Stripe checkout round
 *    trip are left completely alone.
 */
export default function NativeShell() {
  useEffect(() => {
    if (!isNativeShell()) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const [{ StatusBar, Style }, { SplashScreen }, { App }, { Browser }] =
        await Promise.all([
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
          import("@capacitor/app"),
          import("@capacitor/browser"),
        ]);
      if (disposed) return;

      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#ffffff" });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {
        // Status bar styling is cosmetic — never block the app on it.
      }
      try {
        await SplashScreen.hide();
      } catch {
        // The config's launchAutoHide is the backstop.
      }

      const back = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else if (
          window.location.pathname === "/" ||
          window.location.pathname === "/app"
        ) {
          void App.minimizeApp().catch(() => undefined);
        } else {
          window.history.back();
        }
      });
      cleanups.push(() => void back.remove());

      const onClick = (event: MouseEvent) => {
        const anchor = (event.target as HTMLElement | null)?.closest?.("a");
        if (!anchor) return;
        const href = anchor.href;
        if (!href) return;
        if (/^(tel:|mailto:|sms:)/i.test(href)) {
          event.preventDefault();
          window.open(href, "_system");
          return;
        }
        let url: URL;
        try {
          url = new URL(href);
        } catch {
          return;
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        if (url.origin === window.location.origin) return;
        // Stripe's hosted surfaces stay in the shell (config
        // allowNavigation) — the checkout round trip depends on it.
        if (
          url.hostname === "checkout.stripe.com" ||
          url.hostname === "js.stripe.com" ||
          url.hostname === "hooks.stripe.com"
        ) {
          return;
        }
        event.preventDefault();
        void Browser.open({ url: href }).catch(() => {
          window.open(href, "_system");
        });
      };
      document.addEventListener("click", onClick, true);
      cleanups.push(() => document.removeEventListener("click", onClick, true));
    })();

    return () => {
      disposed = true;
      for (const clean of cleanups) clean();
    };
  }, []);

  return null;
}
