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
 *   - The page resolves the ONE global theme like every other
 *     route (design pass #7, 2026-11-16: the light blue/white set
 *     is the global default in globals.css and the homepage's old
 *     page-scoped token override is gone — one website, no
 *     page-scoped hacks; theme.test.ts pins the unification).
 *   - HomeHeader: the WHITE bar — MECHA lockup (unchanged), the
 *     nav CENTERED — "How It Works" (anchor to the steps section)
 *     + Pricing + For Shops (conversion pass, 2026-11-20: the
 *     audit found Pricing missing and the "Safety" link crowding
 *     the bar; /diagnose stays live, linked elsewhere) — Sign in
 *     + the blue "Start Free" pill → /register
 *     (signed out) / Open app + Run a diagnosis (signed in). The
 *     shared Header is NOT on home.
 *   - Hero: ONE full-screen photo (the generated sunrise road,
 *     a local asset), centered eyebrow "Drive with confidence."
 *     (pass #13, 2026-11-16: the owner replaced the old domain
 *     eyebrow — visitors are already on the site), the outcome
 *     headline "Know what's wrong with your car — and what the
 *     repair should cost.", the supporting copy (hero.sub), and
 *     exactly ONE filled button: blue "Diagnose my car free"
 *     (account-first, the pass #4 gate behavior); the sample
 *     report is a text link under it and the microcopy line
 *     (free account · no card · informational only) closes the
 *     block (conversion pass, 2026-11-20).
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
 *       HomeMarketplace — OFF the homepage since the conversion
 *         pass (2026-11-20): /marketplace has no listings yet;
 *         the component and route stay in the codebase.
 *       HomePlans — the shared pricing cards (pass #8: the
 *         compact PlanCards, the same cards /pricing renders),
 *         every string reused from the pricing catalog, one
 *         button → /pricing.
 *   - HomeShops: pass #4's ONE full-screen visual, restyled light
 *     (lighter scrim, the blue button to /shops).
 *   - HomeCta: #2's blue closing band directly above the footer —
 *     "Start with 5 free diagnoses" (a true claim) + ONE white
 *     button "Try MECHA free" → /register (create account: the
 *     free diagnoses live inside an account).
 *   - HomeFooter: wordmark, the legal links, copyright. The
 *     shared Footer is NOT on home.
 *   - Pass #17 (2026-11-17, owner: "the video should be at the
 *     bottom, at the end"): the ORDER above is pass #6's; the
 *     film sections (HomeDiagnosis, HomeFairPrice, HomeScan,
 *     HomeVault, HomeShops) have since moved as one block to
 *     AFTER HomeCta, immediately before HomeFooter — the SECTIONS
 *     array below pins the live order. Content unchanged.
 *   - Pass #18 (2026-11-17, owner, kuttsy.com's comparison page
 *     as the model): HomeCompare sits between HomePlans and
 *     HomeCta — one headline ("MECHA vs. other apps."), MECHA in
 *     a white card vs a muted "Other apps" card, exactly four
 *     short rows of true live features, all copy from the hero
 *     catalog. The dedicated test below pins the section.
 *   - Pass #19 (2026-11-17, owner): HomeDemo sits directly under
 *     the Hero — one headline + the sample note + one blue button
 *     to /demo, the guided sample walkthrough (canned content
 *     only; tests/demo.test.ts pins the whole pass). The hero
 *     also carries a small text link to /demo under its two
 *     buttons. Pass #17's film block stays at the bottom.
 *   - Pass #19 follow-up (2026-11-17, owner): HomeReviews +
 *     HomeShowcase join the proof area between HomeCompare and
 *     HomeCta — a data-driven reviews carousel (samples today,
 *     under a visible "Sample reviews" badge; lib/reviews is
 *     the single source) and an auto-passing band of the site's
 *     own loop clips. tests/carousels.test.ts pins both. The
 *     film block still closes the page.
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
  "<HomeDemo",
  "<HomeSteps",
  "<HomePlans",
  "<HomeCompare",
  "<HomeReviews",
  "<HomeShowcase",
  "<HomeCta",
  "<HomeDiagnosis",
  "<HomeFairPrice",
  "<HomeScan",
  "<HomeVault",
  "<HomeShops",
  "<HomeFooter",
];

test("homepage composition: header, hero, demo, steps, plans, compare, reviews, showcase, blue band, the film sections at the end, minimal footer — nothing else (marketplace section hidden, conversion pass 2026-11-20)", () => {
  const page = read("app/page.tsx");
  for (const shell of SECTIONS) {
    assert.ok(page.includes(shell), `homepage renders ${shell}`);
  }
  // Order is the layout (Pass #17, 2026-11-17, owner: "the video
  // should be at the bottom, at the end"): the photo/content
  // sections and the blue band run first; every looping-film
  // section (Diagnosis, FairPrice, Scan, Vault, Shops) closes
  // the page after the band, directly above the footer.
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

test("homepage carries no page-scoped token override — it resolves the one global theme (pass #7)", () => {
  const page = read("app/page.tsx");
  // Passes #5–6 scoped the complete light token set on this page's
  // root while every other route ran dark + amber — the "different
  // website" split the owner caught. The scope is gone: tokens
  // resolve from globals.css exactly as on every other route.
  assert.ok(!page.includes("LIGHT_SCOPE"), "the page-scoped token override is removed");
  assert.ok(!page.includes('"--color-'), "the homepage assigns no theme tokens of its own");
  assert.ok(page.includes('className="bg-bg text-ink-1"'), "the page paints the global tokens");
});

test("home header: white bar — wordmark, centered routes, Sign in + blue Start Free pill", () => {
  const header = read("components/HomeHeader.tsx");
  assert.ok(header.includes("<LogoLockup"), "the wordmark lockup leads");
  assert.ok(header.includes("bg-surface"), "the bar is the light surface (white — the global default since pass #7)");
  assert.ok(header.includes("grid-cols-[1fr_auto_1fr]"), "the three-column grid centers the nav");
  // Conversion pass (2026-11-20, owner-approved audit): the nav
  // is How It Works + Pricing + For Shops — How It Works anchors
  // to the steps section on this page; Pricing and For Shops are
  // real routes the audit found missing from the homepage nav.
  assert.ok(
    header.includes('href="#how-it-works"') && header.includes("t.header.navHowItWorks"),
    "nav carries How It Works → the steps anchor",
  );
  assert.ok(
    header.includes('href="/pricing"') && header.includes("t.header.navPricing"),
    "nav carries Pricing → /pricing",
  );
  assert.ok(
    header.includes('href="/shops"') && header.includes("t.header.navShops"),
    "nav carries For Shops → /shops",
  );
  // The Safety link left this bar (the /diagnose page it pointed
  // to stays live elsewhere); the Diagnose link stays off it too.
  for (const gone of ["t.header.navSafety", "t.header.navDiagnose"]) {
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

test("hero: one full-screen photo, centered eyebrow + outcome headline + supporting copy, exactly ONE filled button (conversion pass, 2026-11-20)", () => {
  const hero = read("components/Hero.tsx");
  assert.ok(hero.includes('src="/images/hero-road.jpg"'), "the generated road photo is the hero visual");
  assert.ok(existsSync(join(root, "public/images/hero-road.jpg")), "the hero photo ships as a local asset");
  assert.ok(hero.includes("min-h-[calc(100svh-4rem)]"), "the hero fills the screen under the bar");
  assert.ok(hero.includes("Drive with confidence."), "the eyebrow tagline (an owner-set literal, pass #13)");
  assert.ok(!hero.includes("MECHATECH.IO"), "the old domain eyebrow is gone (pass #13)");
  assert.ok(hero.includes("t.hero.copilotTitle"), "the headline is the outcome line (catalog: hero.copilotTitle)");
  assert.ok(
    hero.includes("t.hero.sub"),
    "the supporting copy is hero.sub — what you do, what you get, 5 free / no card",
  );
  // Primary: Diagnose my car free → /app/diagnose, with the
  // account-first return-to saved for signed-out visitors (the
  // diagnosis gate, pass #4 behavior).
  assert.ok(hero.includes('href="/app/diagnose"'), "primary targets the diagnosis");
  assert.ok(hero.includes("t.hero.startFreeCta"), "primary label is Diagnose my car free");
  assert.ok(hero.includes("bg-[#2563eb]"), "primary is the reference blue");
  assert.ok(hero.includes("RETURN_TO_KEY"), "signed-out clicks save the return-to");
  assert.ok(hero.includes("getToken()"), "the return-to is saved only when signed out");
  // ONE path: the "See how it works" button is gone; the sample
  // report is a text link, and the microcopy line closes the
  // block (free account · no card · informational only).
  assert.ok(!hero.includes("t.hero.howCta"), "the See how it works button left the hero");
  assert.ok(hero.includes('href="/demo"') && hero.includes("t.hero.demoCta"), "the sample report is a text link to /demo");
  assert.ok(hero.includes("t.hero.microcopy"), "the microcopy line renders under the actions");
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
  assert.ok(s.includes("t.hero.startFreeCta"), "the button label is Diagnose my car free");
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

test("home marketplace: the talking explainer is the visual, one button to /marketplace, watch-with-sound wired", () => {
  const s = read("components/HomeMarketplace.tsx");
  assert.ok(!s.includes("marketplace-car.jpg"), "the stock photo is gone — the film replaced it");
  assert.ok(s.includes('src="/videos/mecha-explainer.webm"') && s.includes('src="/videos/mecha-explainer.mp4"'), "the explainer is the visual (webm first, mp4 fallback)");
  assert.ok(existsSync(join(root, "public/videos/mecha-explainer.mp4")), "the explainer mp4 ships as a local asset");
  assert.ok(existsSync(join(root, "public/videos/mecha-explainer.webm")), "the explainer webm ships as a local asset");
  assert.ok(s.includes('poster="/videos/explainer-poster.jpg"'), "the poster is a frame from the film");
  assert.ok(existsSync(join(root, "public/videos/explainer-poster.jpg")), "the poster ships as a local asset");
  assert.ok(s.includes("autoPlay") && s.includes("muted") && s.includes("loop") && s.includes("playsInline"), "the ambient pass is a muted autoplaying loop");
  assert.ok(s.includes('preload="none"') && s.includes("IntersectionObserver"), "the film lazy-loads near the viewport — the homepage does not pay for it up front");
  assert.ok(s.includes("t.hero.watchWithSound"), "the watch-with-sound control is labeled from the catalog");
  assert.ok(s.includes("currentTime = 0") && s.includes("muted = false"), "one tap restarts the film from the beginning, unmuted — the narration is the point");
  assert.ok(s.includes("t.hero.soundOff"), "the mute control is labeled from the catalog");
  assert.ok(s.includes("t.hero.marketTitle") && s.includes("t.hero.marketLine"), "headline + one line from the catalog");
  assert.ok(s.includes("t.hero.marketCta"), "the button label is Browse cars");
  assert.ok(s.includes('href="/marketplace"'), "the button targets the marketplace");
});

test("home plans strip: the shared pricing cards (compact), one button to /pricing", () => {
  const plans = read("components/HomePlans.tsx");
  const cards = read("components/PlanCards.tsx");
  // Pass #8: the strip renders the ONE pricing system — the same
  // PlanCards /pricing renders, in their compact variant.
  assert.ok(plans.includes("<PlanCards"), "the strip renders the shared plan cards");
  assert.ok(plans.includes('variant="compact"'), "the strip uses the compact variant");
  assert.ok(plans.includes("bg-bg"), "the strip sits on the page paper so the white cards read as cards");
  for (const key of [
    "p.free.name",
    "p.free.price",
    "p.free.period",
    "p.free.point1",
    "p.pro.name",
    "p.pro.price",
    "p.pro.period",
    "p.pro.point1",
    "p.shops.name",
    "p.shops.price",
    "p.shops.period",
    "p.shops.point1",
  ]) {
    assert.ok(cards.includes(key), `plan copy is reused from the pricing catalog: ${key}`);
  }
  // Reused, never restated: no price literal can drift from /pricing.
  assert.ok(!plans.includes("$9.99") && !plans.includes("$149"), "no hardcoded prices in the strip");
  assert.ok(!cards.includes("$9.99") && !cards.includes("$149"), "no hardcoded prices in the cards");
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

test("home compare: MECHA vs. other apps — white card vs muted card, four short rows, catalog copy only", () => {
  const s = read("components/HomeCompare.tsx");
  // The headline and both column headers come from the catalog.
  assert.ok(s.includes("t.hero.compareTitle") && s.includes("t.hero.compareTitleAlt"), "the headline is MECHA vs. other apps.");
  assert.ok(s.includes("t.hero.compareMecha"), "the left column header is MECHA");
  assert.ok(s.includes("t.hero.compareOther"), "the right column header is Other apps");
  // Exactly the four pinned rows, every cell from the catalog.
  for (const key of [
    "compareAnswersLabel",
    "compareAnswersMecha",
    "compareAnswersOther",
    "comparePriceLabel",
    "comparePriceMecha",
    "comparePriceOther",
    "compareLightsLabel",
    "compareLightsMecha",
    "compareLightsOther",
    "compareHistoryLabel",
    "compareHistoryMecha",
    "compareHistoryOther",
  ]) {
    assert.ok(s.includes(`t.hero.${key}`), `the row copy comes from the catalog: ${key}`);
  }
  // The two-card treatment in MECHA's own tokens: MECHA on the
  // white surface, Other apps muted on the inset well.
  assert.ok(s.includes("bg-surface"), "the MECHA column is the white surface card");
  assert.ok(s.includes("bg-inset"), "the Other apps column is muted on the inset well");
  // Honesty pins: no competitor is named, no price or statistic
  // is stated anywhere in the section.
  for (const banned of ["Fixd", "CarMD", "OBD", "$", "%"]) {
    assert.ok(!s.includes(banned), `no competitor names, prices, or stats: ${banned}`);
  }
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
