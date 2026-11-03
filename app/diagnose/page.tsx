import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { DiagnosePageContent } from "@/components/MarketingRoutes";

export const metadata: Metadata = {
  title: "Diagnose — MECHA",
  description:
    "Describe a symptom, photograph a warning light, or start from a VIN or fault code. MECHA returns ranked causes, a severity verdict, the fair repair range, and the next step.",
};

/**
 * Route `/diagnose` — the standalone diagnosis product page
 * (blueprint §2.1, route 2). Marketing chrome, full product depth:
 * entry modes, process, the expanded report contents, an honest
 * example, the severity guide, streaming, and the free meter.
 */
export default function DiagnosePage() {
  return (
    <>
      <Header />
      <main>
        <DiagnosePageContent />
      </main>
      <Footer />
    </>
  );
}
