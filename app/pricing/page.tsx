import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PricingPageContent } from "@/components/MarketingRoutes";

export const metadata: Metadata = {
  title: "Pricing — MECHA",
  description:
    "MECHA pricing in full: Free with 5 diagnoses, Pro at $9.99 per month, and Shops at $149 per month per location — with the meter and cancel-anytime billing explained.",
};

/**
 * Route `/pricing` — the standalone pricing page (blueprint §2.1,
 * route 4). The three standing plans, who each one fits, the free
 * meter in plain sight, and web billing without dark patterns.
 */
export default function PricingPage() {
  return (
    <>
      <Header />
      <main>
        <PricingPageContent />
      </main>
      <Footer />
    </>
  );
}
