import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ShopsPageContent } from "@/components/MarketingRoutes";

export const metadata: Metadata = {
  title: "For Shops & Towing — MECHA",
  description:
    "List a repair shop or towing company on MECHA: name-first nearby results, distance, tap-to-call, the $149 per-location plan, and a parts-ordering path from finished diagnoses.",
};

/**
 * Route `/shops` — the standalone business landing (blueprint §2.1,
 * route 5) for repair shops and towing companies. It shows the nearby
 * promise from the driver's side, what a listing contains, the
 * per-location plan, and the shop parts-ordering angle.
 */
export default function ShopsPage() {
  return (
    <>
      <Header />
      <main>
        <ShopsPageContent />
      </main>
      <Footer />
    </>
  );
}
