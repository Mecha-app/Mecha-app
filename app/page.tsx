import { Businesses } from "@/components/Businesses";
import { DiagnosisExample } from "@/components/DiagnosisExample";
import { FairPriceQuote } from "@/components/FairPriceQuote";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HeroFilm } from "@/components/HeroFilm";
import { HowItWorks } from "@/components/HowItWorks";
import { InUse } from "@/components/InUse";
import { Pricing } from "@/components/Pricing";
import { FinalCta } from "@/components/FinalCta";

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
 */
export default function HomePage() {
  return (
    <>
      <Header overlay />
      <main>
        <Hero />
        <HeroFilm />
        <InUse />
        <DiagnosisExample />
        <FairPriceQuote />
        <HowItWorks />
        <Businesses />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
