import type { CSSProperties } from "react";
import { Hero } from "@/components/Hero";
import { HomeCta } from "@/components/HomeCta";
import { HomeFooter } from "@/components/HomeFooter";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeShops } from "@/components/HomeShops";
import { HomeSteps } from "@/components/HomeSteps";

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
 *
 * The light page is carried by LIGHT_SCOPE below: the COMPLETE
 * light token set (the exact values of the [data-theme="light"]
 * block in globals.css) re-pointed on this page's root element
 * only — the HomeHeader FLOATING_PALETTE mechanism, widened to
 * the whole page. Background and foreground tokens always resolve
 * from the SAME (light) set inside the homepage, so the theme
 * atomicity rule holds: no mixed pairing is possible, globals.css
 * is untouched, and every other page keeps the stored theme.
 */
const LIGHT_SCOPE = {
  "--color-bg": "#f7f8fa",
  "--color-surface": "#ffffff",
  "--color-surface-raised": "#ffffff",
  "--color-inset": "#eef1f4",
  "--color-line": "#dce1e8",
  "--color-ink-1": "#10141b",
  "--color-ink-2": "#333d49",
  "--color-ink-3": "#4d5764",
  "--color-accent": "#96620a",
  "--color-accent-bright": "#9c6608",
  "--color-accent-deep": "#96620a",
  "--color-accent-ink": "#ffffff",
} as CSSProperties;

export default function HomePage() {
  return (
    <div style={LIGHT_SCOPE} className="bg-bg text-ink-1">
      <HomeHeader />
      <main>
        <Hero />
        <HomeSteps />
        <HomeShops />
        <HomeCta />
      </main>
      <HomeFooter />
    </div>
  );
}
