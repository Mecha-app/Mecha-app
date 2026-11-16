/**
 * Homepage contract — design pass #5 (2026-11-16, owner reference
 * #1: a bright Mechatech.io concept — "We're gonna keep the logo,
 * everything that we have, but at least the beginning — I like
 * some of this"; reference #2 followed and he directed: #1 stays
 * the base, take SOME of #2 into it — the steps treatment and the
 * blue closing band; "I don't want the rest").
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
 *     card, guidance meter, and card row. The stacked marketing
 *     sections stay OFF home; their components stay in the
 *     codebase and keep serving the other routes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("homepage composition: header, hero, steps, shops visual, blue band, minimal footer — nothing else", () => {
  const page = read("app/page.tsx");
  for (const shell of ["<HomeHeader", "<Hero", "<HomeSteps", "<HomeShops", "<HomeCta", "<HomeFooter"]) {
    assert.ok(page.includes(shell), `homepage renders ${shell}`);
  }
  // Order is the layout: steps directly under the hero, the band
  // directly above the footer.
  const order = ["<HomeHeader", "<Hero", "<HomeSteps", "<HomeShops", "<HomeCta", "<HomeFooter"].map(
    (s) => page.indexOf(s),
  );
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
