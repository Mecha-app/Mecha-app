"use client";

import { useEffect } from "react";
import { isNativeShell } from "@/lib/client/nativeShell";

/**
 * Registers the PWA service worker (public/sw.js — install support
 * + the static icon cache ONLY; it never intercepts /api, auth, or
 * pages). Production browser only: dev servers and the Capacitor
 * shell never register it, and a failed registration is swallowed —
 * the site works identically without the worker, it just can't be
 * installed from the browser's own prompt.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (isNativeShell()) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* best-effort: install polish, never a product dependency */
    });
  }, []);
  return null;
}
