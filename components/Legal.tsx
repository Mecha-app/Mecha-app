import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

/**
 * Shared shell for the legal pages (/privacy, /terms) — built in the
 * dead-link sweep (Scan package): the footer has linked here since
 * WP2, and the routes did not exist. The copy on these pages is the
 * company's own published text, carried over from the legacy site
 * verbatim (repo frontend/src/pages/PrivacyPage.js, TermsPage.js) and
 * restyled — never rewritten, never embellished.
 */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />
      <main>
        <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">Legal</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.01em] text-ink-1">
            {title}
          </h1>
          <p className="mt-2 text-sm text-ink-3">{updated}</p>
          <div className="mt-8">{children}</div>
        </article>
      </main>
      <Footer />
    </>
  );
}

export function LegalSection({
  heading,
  paragraphs,
  items,
}: {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}) {
  return (
    <section className="mt-9">
      <h2 className="font-display text-xl font-semibold text-ink-1">{heading}</h2>
      {paragraphs?.map((p) => (
        <p key={p.slice(0, 32)} className="mt-2.5 text-base leading-relaxed text-ink-2">
          {p}
        </p>
      ))}
      {items && (
        <ul className="mt-2.5 flex list-disc flex-col gap-1.5 ps-5">
          {items.map((item) => (
            <li key={item} className="text-base leading-relaxed text-ink-2">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
