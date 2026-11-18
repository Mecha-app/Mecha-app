import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { resolveShareCard } from "@/lib/server/shareService";
import { getIdentityStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A MECHA diagnosis report",
  description:
    "A shared MECHA report card: the vehicle, the safe-to-drive verdict, and the fair-price range.",
  robots: { index: false, follow: false },
};

/**
 * /share/[token] — the public report card (Pass #20). A driver
 * minted this link from a finished diagnosis; whoever holds it sees
 * exactly the summary the driver chose to share — vehicle, verdict,
 * findings in brief, fair-price range, likely parts — and nothing
 * about the driver's account. An unknown token is a plain 404: the
 * link is the permission, and there is nothing to guess at.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let resolved: Awaited<ReturnType<typeof resolveShareCard>> = null;
  try {
    resolved = await resolveShareCard(getIdentityStore(), token);
  } catch {
    resolved = null;
  }
  if (!resolved) notFound();
  const { card, script } = resolved;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
          A shared MECHA report
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {card.vehicle}
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Diagnosed {new Date(card.createdAt).toLocaleDateString()}
        </p>

        <section className="mt-6 rounded-2xl border border-line bg-surface px-5 py-6">
          <div
            className={
              "border-l-4 pl-4 " +
              (card.band === "stop"
                ? "border-verdict-rip"
                : card.band === "caution"
                  ? "border-verdict-warn"
                  : "border-verdict-fair")
            }
          >
            <h2
              className={
                "font-display text-2xl font-semibold " +
                (card.band === "stop"
                  ? "text-verdict-rip"
                  : card.band === "caution"
                    ? "text-verdict-warn"
                    : "text-verdict-fair")
              }
            >
              {card.headline}
            </h2>
          </div>
          <p className="mt-4 text-base leading-relaxed text-ink-1">{card.summary}</p>
          {card.costLabel && (
            <p className="mt-4 font-mono text-base text-ink-1">
              Fair repair range: {card.costLabel}
            </p>
          )}
          {card.partNames.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                Likely parts
              </h3>
              <ul className="mt-2 flex flex-col gap-1">
                {card.partNames.map((name) => (
                  <li key={name} className="text-base text-ink-1">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-surface px-5 py-6">
          <h3 className="font-display text-xl font-semibold text-ink-1">What to tell the shop</h3>
          <div className="mt-3 flex flex-col gap-3">
            {script.map((line) => (
              <p key={line} className="text-base leading-relaxed text-ink-1">
                {line}
              </p>
            ))}
          </div>
        </section>

        <p className="mt-6 text-sm leading-relaxed text-ink-3">
          MECHA provides AI-assisted information, not a mechanical inspection. Have a qualified
          mechanic confirm any diagnosis before authorizing repairs.
        </p>

        <Link
          href="/register"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
        >
          Run your own diagnosis — 5 free
        </Link>
      </main>
      <Footer />
    </>
  );
}
