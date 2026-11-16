import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ScanLanding } from "@/components/ScanLanding";

export const metadata: Metadata = {
  title: "Scan — MECHA",
  description:
    "MECHA Scan: decode a VIN, identify a dashboard warning light from a photo, or translate a fault code like P0420 — in plain language, with the fair price attached.",
};

/**
 * Route `/scan` — the public Scan landing (blueprint route 3) and the
 * QR-sticker destination. Marketing chrome (non-overlay header, like
 * every non-home marketing surface), content in ScanLanding.
 */
export default function ScanPage() {
  return (
    <>
      <Header />
      <main>
        <ScanLanding />
      </main>
      <Footer />
    </>
  );
}
