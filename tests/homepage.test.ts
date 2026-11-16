/**
 * Homepage contract — design pass #5 (2026-11-16, owner reference
 * #1: a bright Mechatech.io concept — "We're gonna keep the logo,
 * everything that we have, but at least the beginning — I like
 * some of this"; reference #2 followed and he directed: #1 stays
 * the base, take SOME of #2 into it — the steps treatment and the
 * blue closing band; "I don't want the rest") + design pass #6
 * (same day, owner on the live pass #5 page: "It looks way
 * better… but I need you to add more stuff because it's too
 * short… go on Audi, that website, just kind of like catch a
 * couple more stuff and put it all the way down… I want more
 * info").
 *
 * Pinned structure, top to bottom:
 *   - The page root scopes the COMPLETE light token set (the
 *     [data-theme="light"] values) on the page element only, so
 *     the homepage is a light page in both themes while every
 *     other page keeps the stored theme (theme atomicity: bg and
 *     fg always resolve from the same set — globals.css untouched).
 *   - HomeHeader: the WHITE bar — MECHA lockup (unchanged), the
 *     nav CENTERED — exactly "How It Works" (anchor to the steps
 *     section) + "Safety" → /diagnose, per the owner's third
 *     reference — Sign in + the blue "Start Free" pill → /register
 *     (signed out) / Open app + Run a diagnosis (signed in). The
 *     shared Header is NOT on home.
 *   - Hero: ONE full-screen photo (the generated sunrise road,
 *     a local asset), centered eyebrow MECHATECH.IO, the headline
 *     "Your AI mechanic copilot.", ONE subline — our brand line,
 *     NOT the reference's "Know what to do next" — and exactly two
 *     buttons: blue "Start a free diagnosis" (account-first, the
 *     pass #4 gate behavior) + outline "See how it works"
 *     → /diagnose.
 *   - HomeSteps: #2's treatment — "Three simple steps." + three
 *     numbered steps, bold title + ONE short line each, on white.
 *   - Pass #6 Audi-length sections (the shared HomeFeature shape:
 *     one full-width visual, ONE headline, ONE short line, ONE
 *     blue button — no text walls, no card grids):
 *       HomeDiagnosis — mechanic loop; the hero primary itself
 *         (label, /app/diagnose, account-first return-to).
 *       HomeFairPrice — quote loop → /diagnose.
 *       HomeScan — warning-light loop → /scan.
 *       HomeVault — roadside loop → /register (the line states
 *         the live NHTSA truth only).
 *       HomeMarketplace — the generated car-for-sale photo
 *         → /marketplace (the line states the shipped
 *         guided-photo truth only).
 *       HomePlans — the clean light pricing strip: the three
 *         real plans, every string reused from the pricing
 *         catalog, one button → /pricing.
 *   - HomeShops: pass #4's ONE full-screen visual, restyled light
 *     (lighter scrim, the blue button to /shops).
 *   - HomeCta: #2's blue closing band directly above the footer —
 *     "Start with 5 free diagnoses" (a true claim) + ONE white
 *     button "Try MECHA free" → /register (create account: the
 *     free diagnoses live inside an account).
 *   - HomeFooter: wordmark, the legal links, copyright. The
 *     shared Footer is NOT on home.
 *   - NOT taken from the references: #2's left-aligned hero and
 *     example-diagnosis card, #1's form card, possible-causes
 *     card, guidance meter, and card row. The old stacked
 *     marketing components stay OFF home; their components stay
 *     in the codebase and keep serving the other routes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const SECTIONS = [
  "<HomeHeader",
  "<Hero",
  "<HomeSteps",
  "<HomeDiagnosis",
  "<HomeFairPrice",
  "<HomeScan",
  "<HomeVault",
  "<HomeMarketplace",
  "<HomePlans",
  "<HomeShops",
  "<HomeCta",
  "<HomeFooter",
];

test("homepage composition: header, hero, steps, the Audi-length sections, shops visual, blue band, minimal footer — nothing else", () => {
  const page = read("app/page.tsx");
  for (const shell of SECTIONS) {
    assert.ok(page.includes(shell), `homepage renders ${shell}`);
  }
  // Order is the layout: the pass #6 sections sit between the
  // steps and the shops visual; the band directly above the footer.
  const order = SECTIONS.map((s) => page.indexOf(s));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "sections render in the pinned order");
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

test("homepage is a light page: the complete light token set scoped on the page root", () => {
  const page = read("app/page.tsx");
  // The exact [data-theme="light"] values from globals.css — bg and
  // fg ship together, so no mixed pairing is possible on this page.
  for (const token of [
    '"--color-bg": "#f7f8fa"',
    '"--color-surface": "#ffffff"',
    '"--color-ink-1": "#10141b"',
    '"--color-ink-2": "#333d49"',
    '"--color-ink-3": "#4d5764"',
    '"--color-line": "#dce1e8"',
    '"--color-accent-ink": "#ffffff"',
  ]) {
    assert.ok(page.includes(token), `page root scopes ${token}`);
  }
  assert.ok(page.includes('className="bg-bg text-ink-1"'), "the page paints its scoped tokens");
});

test("home header: white bar — wordmark, centered routes, Sign in + blue Start Free pill", () => {
  const header = read("components/HomeHeader.tsx");
  assert.ok(header.includes("<LogoLockup"), "the wordmark lockup leads");
  assert.ok(header.includes("bg-surface"), "the bar is the light surface (white in the page scope)");
  assert.ok(header.includes("grid-cols-[1fr_auto_1fr]"), "the three-column grid centers the nav");
  // Owner's third reference: exactly How It Works + Safety in the
  // nav — How It Works anchors to the steps section on this page,
  // Safety goes to /diagnose (safety guidance lives in results).
  assert.ok(
    header.includes('href="#how-it-works"') && header.includes("t.header.navHowItWorks"),
    "nav carries How It Works → the steps anchor",
  );
  assert.ok(
    header.includes('href="/diagnose"') && header.includes("t.header.navSafety"),
    "nav carries Safety → /diagnose",
  );
  // The Diagnose / Pricing / For shops links left this bar (they
  // remain on the shared Header and reachable elsewhere).
  for (const gone of ['href="/pricing"', 'href="/shops"', "t.header.navDiagnose", "t.header.navPricing", "t.header.navShops"]) {
    assert.ok(!header.includes(gone), `home header no longer carries ${gone}`);
  }
  // Signed out: Sign in + the blue Start Free pill to /register.
  assert.ok(header.includes('href="/login"') && header.includes("t.header.signIn"), "sign-in link");
  assert.ok(
    header.includes('href="/register"') && header.includes("t.header.startFree"),
    "signed-out primary is Start Free → /register",
  );
  assert.ok(header.includes("bg-[#2563eb]"), "the primary pill is the reference blue");
  // Signed in: Open app + the Run a diagnosis pill to /app/diagnose,
  // driven by the stored session token (pass #4 behavior).
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

test("hero: one full-screen photo, centered eyebrow + copilot headline + brand subline, exactly two buttons", () => {
  const hero = read("components/Hero.tsx");
  assert.ok(hero.includes('src="/images/hero-road.jpg"'), "the generated road photo is the hero visual");
  assert.ok(existsSync(join(root, "public/images/hero-road.jpg")), "the hero photo ships as a local asset");
  assert.ok(hero.includes("min-h-[calc(100svh-4rem)]"), "the hero fills the screen under the bar");
  assert.ok(hero.includes("MECHATECH.IO"), "the brand eyebrow (a literal, like the wordmark)");
  assert.ok(hero.includes("t.hero.copilotTitle"), "the headline is Your AI mechanic copilot.");
  assert.ok(
    hero.includes("t.hero.titleLine1") && hero.includes("t.hero.titleLine2"),
    "the one subline is our brand line — Know what's wrong. Know what it should cost.",
  );
  // Primary: Start a free diagnosis → /app/diagnose, with the
  // account-first return-to saved for signed-out visitors (the
  // diagnosis gate, pass #4 behavior).
  assert.ok(hero.includes('href="/app/diagnose"'), "primary targets the diagnosis");
  assert.ok(hero.includes("t.hero.startFreeCta"), "primary label is Start a free diagnosis");
  assert.ok(hero.includes("bg-[#2563eb]"), "primary is the reference blue");
  assert.ok(hero.includes("RETURN_TO_KEY"), "signed-out clicks save the return-to");
  assert.ok(hero.includes("getToken()"), "the return-to is saved only when signed out");
  // Secondary: See how it works → /diagnose.
  assert.ok(hero.includes('href="/diagnose"'), "secondary targets /diagnose");
  assert.ok(hero.includes("t.hero.howCta"), "secondary label is See how it works");
  // The old hero machinery is gone from the hero.
  assert.ok(!hero.includes("LoopClip"), "the hero loop left the hero — the photo carries it");
  assert.ok(!hero.includes("t.hero.pricingCta"), "the pricing CTA left the hero");
  assert.ok(!hero.includes('href="/pricing"'), "no pricing link in the hero");
  assert.ok(!hero.includes('href="#'), "no anchor links into removed sections");
});

test("home steps: Three simple steps — three numbered steps, bold title + one short line each, on white", () => {
  const steps = read("components/HomeSteps.tsx");
  assert.ok(steps.includes('id="how-it-works"'), "the section is the header's How It Works anchor target");
  assert.ok(steps.includes("bg-surface"), "the section sits on the white surface");
  assert.ok(steps.includes("t.hero.stepsTitle"), "the heading is Three simple steps.");
  for (const key of [
    "t.hero.step1Title",
    "t.hero.step1Line",
    "t.hero.step2Title",
    "t.hero.step2Line",
    "t.hero.step3Title",
    "t.hero.step3Line",
  ]) {
    assert.ok(steps.includes(key), `step copy comes from the catalog: ${key}`);
  }
  // Numbered badges + the codebase's hand-drawn stroke icons.
  assert.ok(steps.includes("rounded-full bg-[#2563eb]"), "numbered blue badges");
  assert.ok(steps.includes('viewBox: "0 0 24 24"'), "icons follow the codebase stroke-icon pattern");
  for (const icon of ["CarIcon", "DescribeIcon", "WrenchIcon"]) {
    assert.ok(steps.includes(icon), `step icon ${icon}`);
  }
});

test("home feature shape: one full-width visual, one headline, one line, one blue button", () => {
  const feature = read("components/HomeFeature.tsx");
  assert.ok(feature.includes("min-h-[100svh]"), "the section is one full screen");
  assert.ok(feature.includes("<LoopClip name={loop} fill />"), "a loop can fill the screen");
  assert.ok(feature.includes("src={image}"), "or a photo can fill the screen");
  assert.ok(feature.includes("bg-[#2563eb]"), "the one button is the page's blue primary");
  // The diagnosis primary carries the account-first gate behavior.
  assert.ok(feature.includes("RETURN_TO_KEY"), "the gated button saves the return-to");
  assert.ok(feature.includes("getToken()"), "the return-to is saved only when signed out");
});

test("home diagnosis: mechanic loop, the hero primary as its button", () => {
  const s = read("components/HomeDiagnosis.tsx");
  assert.ok(s.includes('loop="mechanic"'), "the diagnosis-shown-to-a-mechanic loop is the visual");
  assert.ok(s.includes("t.hero.diagTitle") && s.includes("t.hero.diagLine"), "headline + one line from the catalog");
  assert.ok(s.includes("t.hero.startFreeCta"), "the button label is Start a free diagnosis");
  assert.ok(s.includes('href="/app/diagnose"'), "the button targets the diagnosis");
  assert.ok(s.includes("gate"), "the button carries the account-first gate behavior");
});

test("home fair price: quote loop, one button to /diagnose", () => {
  const s = read("components/HomeFairPrice.tsx");
  assert.ok(s.includes('loop="quote"'), "the shop-counter quote loop is the visual");
  assert.ok(s.includes("t.hero.fairTitle") && s.includes("t.hero.fairLine"), "headline + one line from the catalog");
  assert.ok(s.includes("t.hero.fairCta"), "the button label is Check a repair price");
  assert.ok(s.includes('href="/diagnose"'), "the button targets /diagnose");
});

test("home scan: warning-light loop, one button to /scan", () => {
  const s = read("components/HomeScan.tsx");
  assert.ok(s.includes('loop="diagnose"'), "the warning-light check loop is the visual");
  assert.ok(s.includes("t.hero.scanTitle") && s.includes("t.hero.scanLine"), "headline + one line from the catalog");
  assert.ok(s.includes("t.hero.tryScanCta"), "the button label is Try the scan");
  assert.ok(s.includes('href="/scan"'), "the button targets /scan");
});

test("home vault: roadside loop, the NHTSA line, one button to /register", () => {
  const s = read("components/HomeVault.tsx");
  assert.ok(s.includes('loop="roadside"'), "the roadside loop is the visual");
  assert.ok(s.includes("t.hero.vaultTitle") && s.includes("t.hero.vaultLine"), "headline + one line from the catalog");
  assert.ok(s.includes("t.hero.vaultCta"), "the button label is Create your free account");
  assert.ok(s.includes('href="/register"'), "the button targets create account — the vault lives inside one");
});

test("home marketplace: the generated listing photo, one button to /marketplace", () => {
  const s = read("components/HomeMarketplace.tsx");
  assert.ok(s.includes('image="/images/marketplace-car.jpg"'), "the generated car-for-sale photo is the visual");
  assert.ok(existsSync(join(root, "public/images/marketplace-car.jpg")), "the photo ships as a local asset");
  assert.ok(s.includes("t.hero.marketTitle") && s.includes("t.hero.marketLine"), "headline + one line from the catalog");
  assert.ok(s.includes("t.hero.marketCta"), "the button label is Browse cars");
  assert.ok(s.includes('href="/marketplace"'), "the button targets the marketplace");
});

test("home plans strip: the three real plans from the pricing catalog, one button to /pricing", () => {
  const plans = read("components/HomePlans.tsx");
  assert.ok(plans.includes("bg-surface"), "the strip sits on the white surface — not a photo section");
  for (const key of [
    "t.pricing.free.name",
    "t.pricing.free.price",
    "t.pricing.free.period",
    "t.pricing.free.point1",
    "t.pricing.pro.name",
    "t.pricing.pro.price",
    "t.pricing.pro.period",
    "t.pricing.pro.point1",
    "t.pricing.shops.name",
    "t.pricing.shops.price",
    "t.pricing.shops.period",
    "t.pricing.shops.point1",
  ]) {
    assert.ok(plans.includes(key), `plan copy is reused from the pricing catalog: ${key}`);
  }
  // Reused, never restated: no price literal can drift from /pricing.
  assert.ok(!plans.includes("$9.99") && !plans.includes("$149"), "no hardcoded prices in the strip");
  assert.ok(plans.includes('href="/pricing"'), "the one button goes to /pricing");
  assert.ok(plans.includes("t.hero.pricingCta"), "the button label is See pricing");
  assert.ok(plans.includes("bg-[#2563eb]"), "the button is the page's blue primary");
});

test("home shops: one more full-screen visual, one line, one blue button to /shops", () => {
  const shops = read("components/HomeShops.tsx");
  assert.ok(shops.includes('<LoopClip name="alert" fill />'), "the recall-alert loop fills the screen");
  assert.ok(shops.includes("min-h-[100svh]"), "the section is one full screen");
  assert.ok(shops.includes("t.hero.shopsLine"), "one short line, from the catalog");
  assert.ok(shops.includes('href="/shops"'), "the one button goes to /shops");
  assert.ok(shops.includes("t.header.navShops"), "the button label comes from the catalog");
  assert.ok(shops.includes("bg-[#2563eb]"), "the button is the page's blue primary");
  assert.ok(!shops.includes("#f5a524"), "the amber pill is gone from the shops section");
});

test("home cta band: blue closing band — 5 free diagnoses + Try MECHA free to /register", () => {
  const cta = read("components/HomeCta.tsx");
  assert.ok(cta.includes("bg-[#2563eb]"), "the band is the full-width reference blue");
  assert.ok(cta.includes("t.hero.bandTitle"), "the line is Start with 5 free diagnoses");
  assert.ok(cta.includes("t.hero.bandCta"), "the button label is Try MECHA free");
  assert.ok(cta.includes('href="/register"'), "the button goes to create account");
  // Owner clarification: the band must NOT point at the diagnosis
  // or any pay page — the free diagnoses live inside an account.
  assert.ok(!cta.includes("/app/diagnose"), "the band button is not the diagnosis");
  assert.ok(!cta.includes("/pricing"), "the band button is not a pay page");
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
