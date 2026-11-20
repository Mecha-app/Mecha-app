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
 *     cooldown, standalone/shell exclusion) and all three install
 *     surfaces exist in the component: the Chromium
 *     beforeinstallprompt button (the ONLY tappable install
 *     action anywhere), the iOS Safari two-step visual guide, and
 *     the iOS in-app-webview "Open in Safari" guide;
 *   - NO DEAD BUTTON (owner report 2026-11-20 ~15:47 ET — "The
 *     Add to Home Screen button doesn't work when clicking it"):
 *     iOS has no programmatic install, so the guide variants must
 *     never render a button wired to the install handler, and a
 *     tap on the steps must visibly respond (the highlight walk);
 *   - the pure detectors behave, including webview UAs (Facebook,
 *     Instagram, TikTok, bare WKWebView, CriOS);
 *   - the install strings resolve in every locale, genuinely
 *     translated in the launch + growth spot checks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getDictionary } from "../lib/i18n";
import { isIosSafari, isIosWebview, isStandaloneDisplay } from "../lib/client/pwa";

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

test("install hint: three surfaces, every gate, dismissal remembered", () => {
  const hint = read("components/PwaInstall.tsx");
  // Android/Chromium: the real event, stashed and fired by the button.
  assert.ok(hint.includes('"beforeinstallprompt"'), "the install event is captured");
  assert.ok(hint.includes("deferred.prompt()"), "the Install button fires the real prompt");
  assert.ok(hint.includes('"appinstalled"'), "installing retires the hint");
  // iOS Safari: the Share → Add to Home Screen visual guide.
  assert.ok(hint.includes("isIosSafari"), "the iOS Safari surface is detected");
  assert.ok(hint.includes("t.install.stepShare"), "guide step 1 renders from the catalog");
  assert.ok(hint.includes("t.install.stepAdd"), "guide step 2 renders the iOS menu item");
  // iOS in-app webview: Add to Home Screen does not exist there —
  // the guide's second step is the Safari door instead.
  assert.ok(hint.includes("isIosWebview"), "the webview surface is detected");
  assert.ok(hint.includes("t.install.webviewHint"), "the webview headline renders from the catalog");
  assert.ok(hint.includes("t.install.stepOpenSafari"), "guide step 2 becomes Open in Safari");
  // Gates.
  assert.ok(hint.includes("readInstallViews() < 2"), "no hint before the second view");
  assert.ok(hint.includes("readConsentChoice() === null"), "the cookie bar settles first");
  assert.ok(hint.includes("isInstallDismissed(Date.now())"), "dismissal cooldown gates the hint");
  assert.ok(hint.includes("isStandaloneDisplay"), "the installed app never sees the hint");
  assert.ok(hint.includes("isNativeShell()"), "the Capacitor shell never sees the hint");
  assert.ok(hint.includes("(pointer: coarse)"), "phones only — desktops never");
  assert.ok(hint.includes("setTimeout(() => setVisible(true), 1500)"), "never on first paint");
  assert.ok(hint.includes("writeInstallDismissed(Date.now())"), "Not now is remembered");
  // The tokens are plain CSS vars: Tailwind cannot generate the
  // /95 alpha variant of bg-surface — the class does not exist
  // and the bar renders transparent. The bar must stay opaque.
  assert.ok(hint.includes("bg-surface px-4"), "the bar uses the opaque surface token");
  assert.ok(!hint.includes("bg-surface/"), "no alpha-variant surface class (it cannot compile)");
  // PAUSED by owner order 2026-11-20: the component stays in the
  // repo (everything above still pins its behavior), but the
  // layout must not mount it — the import is commented out and
  // the pause is recorded at the mount site. Re-enabling the bar
  // means restoring the import + mount AND this assertion.
  const layoutSrc = read("app/layout.tsx");
  assert.ok(
    layoutSrc.includes('// import { PwaInstall } from "@/components/PwaInstall";'),
    "the hint import is commented out while paused",
  );
  assert.ok(
    !layoutSrc.includes('\nimport { PwaInstall } from "@/components/PwaInstall";'),
    "no active hint import while paused",
  );
  assert.ok(layoutSrc.includes("PAUSED by owner order"), "the layout records the pause");
});

test("install hint: no dead button — iOS guides teach, they never pretend", () => {
  const hint = read("components/PwaInstall.tsx");
  // The install handler is wired exactly once, and it lives
  // behind the Chromium-only conditional: on iOS there is no
  // prompt to fire, so a button there could only sit dead.
  assert.equal(
    hint.split("onClick={install}").length - 1,
    1,
    "the install handler is wired to exactly one element",
  );
  const promptGate = hint.indexOf('mode === "prompt" ? (');
  assert.ok(promptGate !== -1, "the Chromium variant is a distinct branch");
  assert.ok(
    promptGate < hint.indexOf("onClick={install}"),
    "the one install button renders only in the prompt branch",
  );
  assert.ok(
    hint.includes("{mode === \"prompt\" ? ("),
    "the Install button element itself is prompt-gated",
  );
  // The guide is a picture, not a control: the steps container is
  // a plain div (no <button>), styled like the phone's own menu
  // (inset tiles, a menu row) — no filled accent pill to mistake
  // for an action.
  assert.ok(hint.includes("data-install-steps"), "the steps block is marked");
  const stepsAt = hint.indexOf("data-install-steps");
  const stepsBlock = hint.slice(stepsAt, stepsAt + 400);
  assert.ok(!stepsBlock.includes("<button"), "no button element wraps the steps");
  assert.ok(stepsBlock.includes("onClick"), "tapping the steps has a handler");
  assert.ok(
    hint.includes("runGuideRef.current()"),
    "a tap on the steps replays the highlight walk — visibly responding",
  );
  assert.ok(hint.includes("setPulseStep(1)"), "the walk lights step 1");
  assert.ok(hint.includes("setPulseStep(2)"), "the walk lights step 2");
  assert.ok(
    hint.includes("bg-inset"),
    "the steps use inset menu styling, not a filled button surface",
  );
  // The variant is observable end to end (screenshots/e2e key on it).
  assert.ok(hint.includes("data-install-variant={mode}"), "the bar exposes its variant");
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
  // In-app webviews: an iOS UA that is not Safari's is a webview
  // or a third-party browser — Add to Home Screen does not exist
  // in any of them, and "Open in Safari" is the only door.
  const facebookIos =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/443.0.0.0.0;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.2;FBSS/2;FBID/phone;FBLC/en_US;FBOP/5]";
  assert.equal(isIosWebview(facebookIos), true, "the Facebook app webview is a webview");
  assert.equal(isIosSafari(facebookIos), false);
  const instagramIos =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.0 (iPhone15,2; iOS 17_2; en_US; en; scale=3.00; 1179x2556; 546372901)";
  assert.equal(isIosWebview(instagramIos), true, "the Instagram app webview is a webview");
  const tiktokIos =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_2023205030 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US BytedanceWebview/d8a21c6";
  assert.equal(isIosWebview(tiktokIos), true, "the TikTok app webview is a webview");
  const bareWebview =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
  assert.equal(isIosWebview(bareWebview), true, "a WKWebView UA without a Safari token is a webview");
  assert.equal(
    isIosWebview(iphoneSafari.replace("Version/17.0", "CriOS/120.0")),
    true,
    "iOS Chrome gets the Safari guidance too — it cannot add from its own menu",
  );
  assert.equal(isIosWebview(iphoneSafari), false, "real iOS Safari is not a webview");
  assert.equal(isIosWebview(androidChrome), false, "Android is never an iOS webview");
  assert.equal(isIosWebview(ipadDesktopUa, 0), false, "a real Mac is not a webview");
  assert.equal(isStandaloneDisplay(true, undefined), true);
  assert.equal(isStandaloneDisplay(false, true), true);
  assert.equal(isStandaloneDisplay(false, false), false);
  assert.equal(isStandaloneDisplay(false, undefined), false);
});

test("install strings: every locale resolves them, spot locales translate them", () => {
  for (const code of ["en", "es", "fr", "ht", "pt", "de", "it", "pl", "ru", "uk", "tr", "ar", "he"] as const) {
    const dict = getDictionary(code);
    for (const key of [
      "label",
      "title",
      "body",
      "button",
      "stepShare",
      "stepAdd",
      "stepOpenSafari",
      "webviewHint",
      "dismiss",
    ] as const) {
      assert.ok(dict.install[key].length > 0, `${code}: install.${key} resolves non-empty`);
    }
  }
  assert.equal(getDictionary("es").install.button, "Instalar");
  assert.equal(getDictionary("de").install.title, "MECHA zum Startbildschirm hinzufügen");
  assert.equal(getDictionary("ht").install.button, "Enstale");
  // The guide steps are translated too — the menu item a Spanish
  // phone actually shows, the Safari door in German, Share in
  // Haitian Creole, the webview line in Arabic.
  assert.equal(getDictionary("en").install.stepAdd, "Add to Home Screen");
  assert.equal(getDictionary("es").install.stepAdd, "Añadir a pantalla de inicio");
  assert.equal(getDictionary("de").install.stepOpenSafari, "In Safari öffnen");
  assert.equal(getDictionary("ht").install.stepShare, "Pataje");
  assert.notEqual(getDictionary("ar").install.webviewHint, getDictionary("en").install.webviewHint);
  assert.notEqual(getDictionary("fr").install.stepAdd, getDictionary("en").install.stepAdd);
});
