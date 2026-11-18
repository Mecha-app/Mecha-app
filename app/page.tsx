import { Hero } from "@/components/Hero";
import { HomeCompare } from "@/components/HomeCompare";
import { HomeDemo } from "@/components/HomeDemo";
import { HomeCta } from "@/components/HomeCta";
import { HomeDiagnosis } from "@/components/HomeDiagnosis";
import { HomeFairPrice } from "@/components/HomeFairPrice";
import { HomeFooter } from "@/components/HomeFooter";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeMarketplace } from "@/components/HomeMarketplace";
import { HomePlans } from "@/components/HomePlans";
import { HomeReviews } from "@/components/HomeReviews";
import { HomeShowcase } from "@/components/HomeShowcase";
import { HomeScan } from "@/components/HomeScan";
import { HomeShops } from "@/components/HomeShops";
import { HomeSteps } from "@/components/HomeSteps";
import { HomeVault } from "@/components/HomeVault";

/**
 * Route `/` — marketing home (blueprint §2.1, route 1).
 * Design-elevation pass 1: the header floats over the full-viewport
 * hero film; pillars, Fair Price, sign-up finale.
 * Design pass 2 (2026-11-03, owner feedback: "not enough information…
 * not really convincing"): the page now carries the full argument —
 * what MECHA does (pillars, deepened with per-pillar detail), how a
 * diagnosis actually runs (four steps + what every report includes),
 * the report itself rendered as a labeled example, the nearby shops /
 * towing network and marketplace, honest pricing with the free meter
 * explained, and an FAQ that answers the real objections — before the
 * sign-up finale. Substance in the same design system: section-per-
 * idea rhythm, hairlines, no card clutter, no invented claims (§1.6).
 * Copy pass 2026-11-09 (owner feedback: "too much text… more straight
 * to the point"): copy tightened throughout the catalog, and the two
 * product visuals — the example diagnosis and the fair-price quote
 * check — now sit directly under the hero, before the pillars and the
 * how-it-works explainer, so the offer lands in seconds.
 * Copy pass round 2, same day (owner: "go further — cut whole
 * sections"): the Pillars section is gone — Diagnose/Protect/Remember
 * restated what the hero, the example diagnosis, and the quote check
 * already show (the Health Vault survives in the pricing tier). How
 * It Works keeps only its four steps; its "what every diagnosis
 * includes" checklist duplicated the example report above it. The
 * businesses band is now a one-line strip with links (the full story
 * lives on /shops), and the FAQ keeps its top three questions. Page
 * total: 2,067 → 1,565 → ~1,014 rendered words. Cuts are composition-
 * level: no dictionary keys were removed, so all 13 locales keep
 * parity and the sections can return by recomposing this file.
 * Design pass "Tesla" (2026-11-16, owner: "still a lot of text…
 * show people using the product, like Tesla"): explanatory
 * paragraphs removed across every section (hero sub, section bodies,
 * step bodies, part descriptions, the pricing meter note, the
 * finale body); directly under the hero sits InUse — a wordless
 * band of three looping clips from MECHA's own films showing the
 * product in drivers' hands. Composition-level again: the catalog
 * is untouched, flows and features unchanged.
 * Design pass "Hero" (2026-11-16, owner: "the hero is still text +
 * buttons… put females in the GIFs"): the hero is now a
 * full-viewport looping clip of a woman running a diagnosis in the
 * app, headline and actions over it (Tesla pattern); the dialogue
 * film moved to its own section (HeroFilm) directly underneath,
 * click-to-play as before; the InUse band's first loop is a woman
 * reading a recall alert beside her car. Media-level only — no
 * flow, feature, or catalog change.
 * Design pass "One Screen" (2026-11-16, owner: "page feels
 * polished because the layout is restrained: a simple header, one
 * striking full-screen image/video, a short headline, and clear
 * buttons"): the stacked sections are OFF the homepage. What
 * remains is the slim HomeHeader floating over the hero, the hero
 * itself (the loop, the brand line, exactly two buttons — Run a
 * diagnosis / See pricing), ONE more full-screen visual
 * (HomeShops: the recall-alert loop, one line, one button to
 * /shops), and the minimal HomeFooter. Everything removed still
 * lives where it belongs: the spoken-dialogue film stays in the
 * codebase (HeroFilm, off home), and the diagnosis example, fair
 * price, how-it-works, businesses, pricing, and FAQ components
 * keep serving the /diagnose, /pricing, and /shops routes. The
 * shared Header/Footer are untouched and keep serving every
 * other page. New catalog keys only where the spec names the
 * label (header.getStarted/openApp, hero.runCta/pricingCta/
 * shopsLine), translated across all 13 locales.
 * Design pass #5 (2026-11-16, owner, with a bright Mechatech.io
 * concept as reference #1: "We're gonna keep the logo, everything
 * that we have, but at least the beginning — I like some of this";
 * a second reference followed, and he directed: #1 stays the base,
 * take SOME of #2 into it — "it's about the layout / professional
 * feel"): the homepage is now a LIGHT page in the reference's
 * layout. Top to bottom: the white HomeHeader (logo unchanged,
 * centered nav, Sign in + the blue "Start Free" pill); the Hero —
 * a generated full-screen sunrise-road photo, centered eyebrow /
 * "Your AI mechanic copilot." / our brand line as the one subline /
 * blue "Start a free diagnosis" + outline "See how it works";
 * HomeSteps — #2's treatment: "Three simple steps." + three
 * numbered steps with one short line each, on white; HomeShops —
 * pass #4's full-screen visual, restyled lighter with the blue
 * button; HomeCta — #2's blue closing band ("Start with 5 free
 * diagnoses" — a true claim, verified in production — + ONE white
 * button, "Try MECHA free" → /register: the free diagnoses live
 * inside an account, so signup is the path); the minimal
 * HomeFooter. NOT taken
 * from the references: #2's left-aligned hero, its example-
 * diagnosis card, #1's form card / possible-causes card / guidance
 * meter / card row — restraint stays, per the owner.
 * Design pass #6 (2026-11-16, owner, on the live pass #5 page:
 * "It looks way better… but I need you to add more stuff because
 * it's too short… go on Audi, that website, just kind of like
 * catch a couple more stuff and put it all the way down… I want
 * more info"): LENGTH, in the same restraint. Everything pass #5
 * shipped stays, in its order; between the steps and the shops
 * visual the page now runs the Audi rhythm — full-width visual
 * sections stacked all the way down, each ONE headline, ONE short
 * line, ONE button (the shared HomeFeature shape): Diagnosis (the
 * mechanic loop; the hero primary itself as its button), Fair
 * Price (the quote loop → /diagnose), Scan (the warning-light
 * loop → /scan), Health Vault & Recalls (the roadside loop →
 * /register; the line states the live NHTSA truth only), and
 * Marketplace (a generated car-for-sale photo → /marketplace;
 * the line states the shipped guided-photo truth only) — then a
 * clean light pricing strip (HomePlans: the three real plans,
 * every string reused from the pricing catalog) before the shops
 * visual and the blue band close the page. No text walls, no
 * card grids, no invented claims; new copy went through the
 * catalog in all 13 locales.
 *
 * Design pass #7 (2026-11-16, owner, clicking through from the
 * homepage: "it seems like I'm on the other website… the colors
 * are not the same"): ONE WEBSITE. Passes #5–6 carried this page's
 * light look on a page-scoped token override while every other
 * route still ran the dark theme with the amber accent — two
 * websites. The override is GONE: the light token
 * set with the reference-blue accent is now the global default in
 * globals.css (dark survives only as the explicit toggle opt-in,
 * with the same blue), so this page resolves the exact same
 * tokens as every other route and no page-scoped hack remains.
 *
 * Pass #17 (2026-11-17, owner, first ordered 2026-11-16 ~20:46
 * and confirmed 2026-11-17: "the video should be at the bottom,
 * at the end"): REORDER ONLY. Every section that carries a
 * looping in-use film — HomeDiagnosis (mechanic loop),
 * HomeFairPrice (quote loop), HomeScan (warning-light loop),
 * HomeVault (roadside loop), HomeShops (recall-alert loop) —
 * now renders as the closing block of the page, after the
 * HomeCta band, immediately before the footer, in the same
 * relative order as before. The photo sections (Hero,
 * HomeMarketplace), the steps, the plans strip, and the closing
 * band keep their places above them. Clips, sources, autoplay/
 * loop behavior, copy, and colors are all unchanged — the action
 * comes first, the films close the page.
 *
 * Pass #18 (2026-11-17, owner, with kuttsy.com's comparison
 * page as the model: "just comparing MECHA, how efficient it
 * is compared to other platforms that provide similar
 * services"): ONE new section — HomeCompare, between the plans
 * strip and the blue closing band. The reference's treatment in
 * MECHA's own tokens: one big headline ("MECHA vs. other
 * apps."), MECHA in a white card against a muted "Other apps"
 * card, exactly four short rows of true, live features, and
 * nothing else. No other section moved or changed; the films
 * still close the page.
 *
 * Pass #19 (2026-11-17, owner order): ONE new section —
 * HomeDemo, directly under the hero: the guided demo's door
 * (one headline, one line, one button to /demo, where a
 * visitor walks a sample diagnosis and a sample quote check
 * before creating an account). The hero also gains a small
 * text link to /demo under its two buttons. Nothing else
 * moved; the compare section and the closing films keep
 * their places.
 *
 * Pass #19 follow-up (2026-11-17, owner: "make it visible,
 * like the competitor sites"): TWO sections join the proof
 * area between the comparison and the closing band —
 * HomeReviews, a rotating reviews carousel fed ONLY by
 * lib/reviews (today: SAMPLE reviews under a visible
 * "Sample reviews" badge; real permissioned reviews replace
 * the samples wholesale when they exist — the rule lives in
 * the data file), and HomeShowcase, an auto-passing carousel
 * reusing the product-in-use loop clips. The closing films
 * still end the page, directly above the footer.
 */
export default function HomePage() {
  return (
    <div className="bg-bg text-ink-1">
      <HomeHeader />
      <main>
        <Hero />
        <HomeDemo />
        <HomeSteps />
        <HomeMarketplace />
        <HomePlans />
        <HomeCompare />
        <HomeReviews />
        <HomeShowcase />
        <HomeCta />
        <HomeDiagnosis />
        <HomeFairPrice />
        <HomeScan />
        <HomeVault />
        <HomeShops />
      </main>
      <HomeFooter />
    </div>
  );
}
