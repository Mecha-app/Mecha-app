/**
 * Homepage contract — design pass "One Screen" (2026-11-16, owner:
 * "page feels polished because the layout is restrained: a simple
 * header, one striking full-screen image/video, a short headline,
 * and clear buttons").
 *
 * Pinned structure, top to bottom:
 *   - HomeHeader: the slim bar — wordmark, the three primary
 *     routes, Sign in + Get started (signed out) / Open app + Run
 *     a diagnosis (signed in). The shared Header is NOT on home.
 *   - Hero: the full-viewport loop, the brand line alone, exactly
 *     two buttons — Run a diagnosis (account-first for signed-out
 *     visitors, straight to /app/diagnose signed in) and See
 *     pricing → /pricing. No eyebrow, no points list, no anchors
 *     into removed sections.
 *   - HomeShops: ONE more full-screen visual, one line, one
 *     button to /shops.
 *   - HomeFooter: wordmark, the legal links, copyright. The
 *     shared Footer is NOT on home.
 *   - The stacked sections (HeroFilm, InUse, DiagnosisExample,
 *     FairPriceQuote, HowItWorks, Businesses, Pricing, Faq,
 *     FinalCta) are OFF the homepage — their components stay in
 *     the codebase and keep serving the other routes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("homepage composition: header, hero, one shops visual, minimal footer — nothing else", () => {
  const page = read("app/page.tsx");
  for (const shell of ["<HomeHeader", "<Hero", "<HomeShops", "<HomeFooter"]) {
    assert.ok(page.includes(shell), `homepage renders ${shell}`);
  }
  for (const removed of [
    "<Header",
    "<Footer",
    "<HeroFilm",
    "<InUse",
    "<DiagnosisExample",
    "<FairPriceQuote",
    "<HowItWorks",
    "<Businesses",
    "<Pricing",
    "<Faq",
    "<FinalCta",
  ]) {
    assert.ok(!page.includes(removed), `homepage no longer renders ${removed}`);
  }
  // Removed ≠ deleted: the film and the section components stay in
  // the codebase (the sections keep serving /diagnose, /pricing,
  // /shops via MarketingRoutes).
  for (const kept of [
    "components/HeroFilm.tsx",
    "components/InUse.tsx",
    "components/DiagnosisExample.tsx",
    "components/HowItWorks.tsx",
    "components/Pricing.tsx",
    "components/Header.tsx",
    "components/Footer.tsx",
  ]) {
    assert.ok(existsSync(join(root, kept)), `${kept} stays in the codebase`);
  }
});

test("home header: slim bar — wordmark, three routes, session-aware actions, nothing else", () => {
  const header = read("components/HomeHeader.tsx");
  assert.ok(header.includes("<LogoLockup"), "the wordmark lockup leads");
  for (const href of ['href="/diagnose"', 'href="/pricing"', 'href="/shops"']) {
    assert.ok(header.includes(href), `primary nav carries ${href}`);
  }
  // Signed out: Sign in + the Get started pill to /register.
  assert.ok(header.includes('href="/login"') && header.includes("t.header.signIn"), "sign-in link");
  assert.ok(
    header.includes('href="/register"') && header.includes("t.header.getStarted"),
    "signed-out primary is Get started → /register",
  );
  // Signed in: Open app + the Run a diagnosis pill to /app/diagnose,
  // driven by the stored session token.
  assert.ok(header.includes('href="/app"') && header.includes("t.header.openApp"), "open-app link");
  assert.ok(
    header.includes('href="/app/diagnose"') && header.includes("t.hero.runCta"),
    "signed-in primary is Run a diagnosis → /app/diagnose",
  );
  assert.ok(header.includes("getToken()"), "the session state comes from the stored token");
  // Restraint: the create-account CTA and the shared header's
  // crosshatch texture stay off the homepage bar.
  assert.ok(!header.includes("createAccount"), "no create-account CTA on the home bar");
  assert.ok(!header.includes("crosshatch"), "no texture on the home bar");
});

test("hero: full-screen loop, the brand line alone, exactly the two clear buttons", () => {
  const hero = read("components/Hero.tsx");
  assert.ok(hero.includes('<LoopClip name="hero" fill />'), "the hero loop fills the viewport");
  assert.ok(hero.includes("min-h-[100svh]"), "the hero is one full screen");
  assert.ok(
    hero.includes("t.hero.titleLine1") && hero.includes("t.hero.titleLine2"),
    "the headline is the brand line and nothing else",
  );
  assert.ok(!hero.includes("t.hero.eyebrow"), "no eyebrow over the film");
  assert.ok(!hero.includes("t.hero.points"), "no offer-points list over the film");
  assert.ok(!hero.includes('href="#'), "no anchor links into removed sections");

  // Primary: Run a diagnosis → /app/diagnose, with the account-first
  // return-to saved for signed-out visitors (the diagnosis gate).
  assert.ok(hero.includes('href="/app/diagnose"'), "primary targets the diagnosis");
  assert.ok(hero.includes("t.hero.runCta"), "primary label is Run a diagnosis");
  assert.ok(hero.includes("RETURN_TO_KEY"), "signed-out clicks save the return-to");
  assert.ok(hero.includes("getToken()"), "the return-to is saved only when signed out");
  // Secondary: See pricing → /pricing.
  assert.ok(hero.includes('href="/pricing"'), "secondary targets pricing");
  assert.ok(hero.includes("t.hero.pricingCta"), "secondary label is See pricing");
  // The old scan/fair-price hero actions are gone.
  assert.ok(!hero.includes('href="/app/scan"'), "the scan CTA left the hero");
  assert.ok(!hero.includes("filmFairPrice"), "the fair-price anchor CTA left the hero");
});

test("home shops: one more full-screen visual, one line, one button to /shops", () => {
  const shops = read("components/HomeShops.tsx");
  assert.ok(shops.includes('<LoopClip name="alert" fill />'), "the recall-alert loop fills the screen");
  assert.ok(shops.includes("min-h-[100svh]"), "the section is one full screen");
  assert.ok(shops.includes("t.hero.shopsLine"), "one short line, from the catalog");
  assert.ok(shops.includes('href="/shops"'), "the one button goes to /shops");
  assert.ok(shops.includes("t.header.navShops"), "the button label comes from the catalog");
});

test("home footer: wordmark, the legal links, copyright — minimal", () => {
  const footer = read("components/HomeFooter.tsx");
  assert.ok(footer.includes("<LogoLockup"), "the wordmark closes the page");
  assert.ok(footer.includes('href="/privacy"') && footer.includes('href="/terms"'), "the legal links");
  assert.ok(
    footer.includes("f.operator") && footer.includes("f.rights"),
    "the copyright line comes from the catalog",
  );
  assert.ok(!footer.includes("f.tagline"), "no tagline in the minimal footer");
  assert.ok(!footer.includes("f.disclaimer"), "no disclaimer block in the minimal footer");
});
