import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FAULT_CODE_PAGES, faultCodePage } from "@/lib/server/faultCodes";
import { faultCodeInfo } from "@/lib/server/scan";

export function generateStaticParams() {
  return FAULT_CODE_PAGES.map((entry) => ({ code: entry.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const entry = faultCodePage(code);
  if (!entry) return { title: "Fault code — MECHA" };
  return {
    title: `${entry.code}: ${entry.title} — what it means | MECHA`,
    description: `${entry.code} in plain language: ${entry.plain.slice(0, 150)}…`,
  };
}

const URGENCY_LABEL: Record<string, string> = {
  stop: "Critical",
  soon: "Moderate — Fix Soon",
  monitor: "Minor — Monitor",
};

/**
 * /codes/[code] — one fault code's reference page (Pass #20). The
 * content is the curated SAE generic dataset entry plus the
 * structural facts the product itself derives (system + scope).
 * Codes without a curated entry 404 here — MECHA does not publish a
 * page it can't ground — while the in-app scan still translates any
 * valid code structurally.
 */
export default async function FaultCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const entry = faultCodePage(code);
  if (!entry) notFound();
  const info = faultCodeInfo(entry.code);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
          Fault code reference
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          <span className="font-mono">{entry.code}</span> — {entry.title}
        </h1>
        <p className="mt-3 text-sm text-ink-3">
          {info.system} system ·{" "}
          {info.scope === "generic"
            ? "SAE generic code — this definition is the standard one for every make"
            : "Manufacturer-specific code"}
          {" · "}
          Urgency: {URGENCY_LABEL[entry.urgency]}
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
            What it means
          </h2>
          <p className="mt-2 text-base leading-relaxed text-ink-1">{entry.plain}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
            The usual causes
          </h2>
          <ul className="mt-2 flex list-disc flex-col gap-1 ps-5">
            {entry.causes.map((cause) => (
              <li key={cause} className="text-base leading-relaxed text-ink-1">
                {cause}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">
            A code names the system that complained, not the part that failed — the causes above
            are the standard first checks, and a real diagnosis on your car ranks them before
            anyone orders parts.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
            Can you keep driving?
          </h2>
          <p className="mt-2 text-base leading-relaxed text-ink-1">{entry.driving}</p>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/scan"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
          >
            Scan this code on your car
          </Link>
          <Link
            href="/codes"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-line px-6 text-base font-semibold text-ink-1"
          >
            All fault codes
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
