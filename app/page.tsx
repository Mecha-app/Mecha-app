import { FairPriceQuote } from "@/components/FairPriceQuote";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Pillars } from "@/components/Pillars";
import { WaitlistForm } from "@/components/WaitlistForm";

/**
 * Route `/` — marketing home (blueprint §2.1, route 1).
 * WP2 scope: hero with the produced explainer film, the three pillars,
 * the Fair Price vs Their Quote signature block (+ fair-price film),
 * and the real email-only waitlist finale. The live diagnosis demo card
 * and shops band land in WP6 against the WP3 API.
 */
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Pillars />
        <FairPriceQuote />
        <WaitlistForm />
      </main>
      <Footer />
    </>
  );
}
