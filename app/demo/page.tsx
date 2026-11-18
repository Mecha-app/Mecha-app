import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { GuidedDemo } from "@/components/GuidedDemo";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Demo — MECHA",
  description:
    "Walk a sample diagnosis and a sample quote check, step by step — no account needed. A real diagnosis of your car starts with a free account.",
};

/**
 * Route `/demo` (pass #19, 2026-11-17, owner order) — the guided
 * demo: a SAMPLE diagnosis and a SAMPLE quote check a visitor
 * explores before creating an account. The demo is canned
 * content only (components/GuidedDemo) — it runs nothing, calls
 * nothing, and is labeled a sample throughout. The standing
 * rule is untouched: a real diagnosis requires an account, and
 * the demo's last step is that door.
 */
export default function DemoPage() {
  return (
    <>
      <Header />
      <main>
        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <GuidedDemo />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
