import { Businesses } from "@/components/Businesses";
import { DiagnosisExample } from "@/components/DiagnosisExample";
import { FairPriceQuote } from "@/components/FairPriceQuote";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Pillars } from "@/components/Pillars";
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
 */
export default function HomePage() {
  return (
    <>
      <Header overlay />
      <main>
        <Hero />
        <Pillars />
        <HowItWorks />
        <DiagnosisExample />
        <FairPriceQuote />
        <Businesses />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
