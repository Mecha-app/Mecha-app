/**
 * App-conversion prep (2026-11-18) — the Capacitor shell + install
 * polish are ADDITIVE: these pins hold the contract that the website
 * is untouched by them. The shell loads the live site; every native
 * behavior is feature-detected; the web paths (file inputs, copy
 * link) remain exactly where they were.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("capacitor config: the shell wraps the live site under the suggested appId", () => {
  const config = read("capacitor.config.ts");
  assert.ok(config.includes('appId: "io.mechatech.app"'), "the suggested appId is in place");
  assert.ok(config.includes('appName: "MECHA"'), "the app name is MECHA");
  assert.ok(
    config.includes('url: "https://mechatech.io"'),
    "the shell loads the production site — there is no static export",
  );
  assert.ok(
    config.includes("checkout.stripe.com"),
    "the Stripe checkout round trip is allow-listed to stay in the shell",
  );
  assert.ok(existsSync(join(root, "shell-www/index.html")), "the offline fallback page exists");
  assert.ok(
    read("shell-www/index.html").includes("needs an internet connection"),
    "the fallback page says plainly why it is shown",
  );
});

test("native projects + icon/splash assets are in the repo", () => {
  for (const rel of [
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json",
    "ios/App/App/Assets.xcassets/Splash.imageset/Contents.json",
    "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
    "assets/logo.png",
    "assets/icon-foreground.png",
    "assets/icon-background.png",
    "assets/splash.png",
    "assets/logo.svg",
  ]) {
    assert.ok(existsSync(join(root, rel)), `${rel} ships`);
  }
  const plist = read("ios/App/App/Info.plist");
  assert.ok(plist.includes("NSCameraUsageDescription"), "iOS explains the camera ask");
  assert.ok(plist.includes("NSPhotoLibraryUsageDescription"), "iOS explains the library ask");
});

test("install polish: manifest + touch icon, wired from the layout", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
    name: string;
    short_name: string;
    display: string;
    theme_color: string;
    background_color: string;
    icons: Array<{ src: string; purpose?: string }>;
  };
  assert.equal(manifest.short_name, "MECHA");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#2563eb");
  assert.equal(manifest.background_color, "#ffffff");
  assert.ok(
    manifest.icons.some((i) => i.purpose === "maskable"),
    "a maskable icon is declared",
  );
  for (const icon of manifest.icons) {
    assert.ok(
      existsSync(join(root, "public", icon.src.replace(/^\//, ""))),
      `manifest icon ${icon.src} exists`,
    );
  }
  assert.ok(existsSync(join(root, "public/apple-touch-icon.png")), "the touch icon ships");
  const layout = read("app/layout.tsx");
  assert.ok(layout.includes('manifest: "/manifest.webmanifest"'), "the layout links the manifest");
  assert.ok(layout.includes('apple: "/apple-touch-icon.png"'), "the layout links the touch icon");
  assert.ok(layout.includes("<NativeShell />"), "the layout mounts the shell bootstrap");
});

test("native bridge: feature-detected, browser-inert, no server needles", () => {
  const bridge = read("lib/client/nativeShell.ts");
  assert.ok(bridge.includes("Capacitor.isNativePlatform()"), "detection goes through Capacitor");
  assert.ok(bridge.includes("isNativeShell"), "the detector is exported");
  assert.ok(bridge.includes("pickPhotoNative"), "the native photo path is exported");
  assert.ok(bridge.includes("shareReport"), "the native share path is exported");
  for (const needle of ["/api/diagnose", "/api/scan/photo", "/api/vin/decode"]) {
    assert.ok(!bridge.includes(needle), `the bridge never calls ${needle}`);
  }
  const shell = read("components/NativeShell.tsx");
  assert.ok(shell.includes('"use client"'), "the bootstrap is a client component");
  assert.ok(
    shell.includes("if (!isNativeShell()) return;"),
    "the bootstrap's first act in a browser is to do nothing",
  );
});

test("web behavior unchanged: scan inputs and share fallbacks intact", () => {
  const scan = read("app/app/scan/page.tsx");
  assert.equal(
    scan.split('capture="environment"').length - 1,
    2,
    "both photo inputs keep their web capture path",
  );
  assert.ok(scan.includes("onPhotoPick"), "the web photo handler remains");
  assert.ok(scan.includes("onVinPhoto"), "the web VIN photo handler remains");
  assert.ok(scan.includes("pickPhotoNative"), "the native camera path is wired in alongside");
  const share = read("app/app/diagnose/DiagnosisShare.tsx");
  assert.ok(
    share.includes('useState(initialShareUrl ?? "")'),
    "the share control still opens on an existing link (Pass #20c)",
  );
  assert.ok(share.includes("navigator.clipboard.writeText"), "copy-link remains the fallback");
  assert.ok(share.includes("shareReport"), "the share sheet is offered where one exists");
});
