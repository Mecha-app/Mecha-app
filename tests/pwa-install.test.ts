/**
 * PWA install pass (2026-11-20) — owner order: visitors add MECHA
 * to the phone home screen from the website, ahead of any store
 * app. Pins:
 *   - the manifest is installable and lands a returning (installed)
 *     user on /app, the dashboard door — not the marketing page;
 *   - every declared icon exists on disk at its declared size;
 *   - the service worker is install-support ONLY: it answers the
 *     listed static assets and can never intercept /api, auth, or
 *     a page (no offline cache by design);
 *   - the hint's gates (second view, consent settled, dismissal
 *     cooldown, standalone/shell exclusion) and both install paths
 *     (beforeinstallprompt button; iOS Safari Share line) exist in
 *     the component, and the pure detectors behave;
 *   - the install strings resolve in every locale, genuinely
 *     translated in the launch + growth spot checks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getDictionary } from "../lib/i18n";
import { isIosSafari, isStandaloneDisplay } from "../lib/client/pwa";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function pngSize(rel: string): { width: number; height: number } {
  const buf = readFileSync(join(root, rel));
  assert.equal(buf.toString("ascii", 1, 4), "PNG", `${rel} is a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test("manifest: installable, MECHA-named, returning users land on /app", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
    name: string;
    short_name: string;
    display: string;
    start_url: string;
    scope: string;
    theme_color: string;
    background_color: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
  };
  assert.equal(manifest.name, "MECHA — Your Car's AI Co-Pilot");
  assert.equal(manifest.short_name, "MECHA");
  assert.equal(manifest.display, "standalone");
  // An installed icon is a RETURNING user's door: /app resolves to
  // the dashboard signed in and the sign-in door signed out — the
  // marketing homepage would greet a daily user with an ad.
  assert.equal(manifest.start_url, "/app");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.theme_color, "#2563eb");
  assert.equal(manifest.background_color, "#ffffff");
  assert.ok(
    manifest.icons.some((i) => i.sizes === "192x192" && i.purpose === "any"),
    "a 192 any-purpose icon is declared",
  );
  assert.ok(
    manifest.icons.some((i) => i.sizes === "512x512" && i.purpose === "any"),
    "a 512 any-purpose icon is declared",
  );
  assert.ok(
    manifest.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512"),
    "a 512 maskable icon is declared",
  );
  for (const icon of manifest.icons) {
    const rel = join("public", icon.src.replace(/^\//, ""));
    const [w, h] = icon.sizes.split("x").map(Number);
    assert.deepEqual(pngSize(rel), { width: w, height: h }, `${icon.src} is really ${icon.sizes}`);
  }
  assert.deepEqual(pngSize("public/apple-touch-icon.png"), { width: 180, height: 180 });
  // Safari keys standalone chrome on the apple-prefixed capable
  // tag; Next renders appleWebApp under the standard name only, so
  // the layout ships the prefixed one explicitly.
  assert.ok(
    read("app/layout.tsx").includes('<meta name="apple-mobile-web-app-capable" content="yes" />'),
    "the apple-prefixed capable meta ships in the layout head",
  );
});

test("service worker: static install assets only, never /api or pages", () => {
  const sw = read("public/sw.js");
  for (const asset of [
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
    "/apple-touch-icon.png",
    "/manifest.webmanifest",
  ]) {
    assert.ok(sw.includes(`"${asset}"`), `the worker precaches ${asset}`);
  }
  assert.ok(sw.includes('request.method !== "GET"'), "non-GET requests are never touched");
  assert.ok(
    sw.includes("STATIC_URLS.includes(url.pathname)"),
    "only the listed assets are answered",
  );
  // The safety contract: exactly one respondWith (the static
  // branch), and no API/auth needle anywhere in the file.
  assert.equal(sw.split("event.respondWith").length - 1, 1, "one respondWith — the static branch");
  assert.ok(!sw.includes("/api/"), "no /api handling of any kind");
  const register = read("components/ServiceWorkerRegister.tsx");
  assert.ok(register.includes('register("/sw.js")'), "the registrar registers /sw.js");
  assert.ok(register.includes('NODE_ENV !== "production"'), "dev never registers the worker");
  assert.ok(register.includes("isNativeShell()"), "the Capacitor shell never registers it");
  assert.ok(read("app/layout.tsx").includes("<ServiceWorkerRegister />"), "the layout mounts it");
});

test("install hint: both doors, every gate, dismissal remembered", () => {
  const hint = read("components/PwaInstall.tsx");
  // Android/Chromium: the real event, stashed and fired by the button.
  assert.ok(hint.includes('"beforeinstallprompt"'), "the install event is captured");
  assert.ok(hint.includes("deferred.prompt()"), "the Install button fires the real prompt");
  assert.ok(hint.includes('"appinstalled"'), "installing retires the hint");
  // iOS Safari: the Share → Add to Home Screen teaching line.
  assert.ok(hint.includes("isIosSafari"), "the iOS path is detected");
  assert.ok(hint.includes("t.install.iosHint"), "the iOS line renders from the catalog");
  // Gates.
  assert.ok(hint.includes("readInstallViews() < 2"), "no hint before the second view");
  assert.ok(hint.includes("readConsentChoice() === null"), "the cookie bar settles first");
  assert.ok(hint.includes("isInstallDismissed(Date.now())"), "dismissal cooldown gates the hint");
  assert.ok(hint.includes("isStandaloneDisplay"), "the installed app never sees the hint");
  assert.ok(hint.includes("isNativeShell()"), "the Capacitor shell never sees the hint");
  assert.ok(hint.includes("(pointer: coarse)"), "phones only — desktops never");
  assert.ok(hint.includes("setTimeout(() => setVisible(true), 1500)"), "never on first paint");
  assert.ok(hint.includes("writeInstallDismissed(Date.now())"), "Not now is remembered");
  assert.ok(read("app/layout.tsx").includes("<PwaInstall />"), "the layout mounts the hint");
});

test("detectors: iOS Safari and standalone, pinned without a browser", () => {
  const iphoneSafari =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  assert.equal(isIosSafari(iphoneSafari), true);
  assert.equal(
    isIosSafari(iphoneSafari.replace("Version/17.0", "CriOS/120.0")),
    false,
    "iOS Chrome is not the Safari door",
  );
  const ipadDesktopUa =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
  assert.equal(isIosSafari(ipadDesktopUa, 5), true, "touch iPad on a desktop UA counts");
  assert.equal(isIosSafari(ipadDesktopUa, 0), false, "a real Mac does not");
  const androidChrome =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
  assert.equal(isIosSafari(androidChrome), false);
  assert.equal(isStandaloneDisplay(true, undefined), true);
  assert.equal(isStandaloneDisplay(false, true), true);
  assert.equal(isStandaloneDisplay(false, false), false);
  assert.equal(isStandaloneDisplay(false, undefined), false);
});

test("install strings: every locale resolves them, spot locales translate them", () => {
  for (const code of ["en", "es", "fr", "ht", "pt", "de", "it", "pl", "ru", "uk", "tr", "ar", "he"] as const) {
    const dict = getDictionary(code);
    for (const key of ["label", "title", "body", "button", "iosHint", "dismiss"] as const) {
      assert.ok(dict.install[key].length > 0, `${code}: install.${key} resolves non-empty`);
    }
  }
  assert.equal(getDictionary("es").install.button, "Instalar");
  assert.equal(getDictionary("de").install.title, "MECHA zum Startbildschirm hinzufügen");
  assert.equal(getDictionary("ht").install.button, "Enstale");
  assert.notEqual(getDictionary("ar").install.iosHint, getDictionary("en").install.iosHint);
});
