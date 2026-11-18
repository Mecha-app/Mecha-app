import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { popularModelBySlug } from "@/lib/server/faultCodes";
import { fetchComplaints, fetchRecalls } from "@/lib/server/nhtsa";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const model = popularModelBySlug(slug);
  if (!model) return { title: "Common problems — MECHA" };
  const name = `${model.year} ${model.make} ${model.model}`;
  return {
    title: `${name} common problems — the NHTSA record | MECHA`,
    description: `What owners actually report about the ${name}: the most-reported problem areas and open recalls, straight from NHTSA's records.`,
  };
}

/**
 * /cars/[slug]/common-problems (Pass #20) — a popular model's real
 * problem record, served live from NHTSA at request time: the
 * owner-complaint count, the most-reported components, the newest
 * complaints, and open recalls. This is reference data about the
 * MODEL — never a diagnosis of any specific car — and when NHTSA
 * can't be reached the page says so plainly instead of printing a
 * comforting zero.
 */
export default async function CommonProblemsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = popularModelBySlug(slug);
  if (!model) notFound();
  const name = `${model.year} ${model.make} ${model.model}`;

  const [complaints, recalls] = await Promise.all([
    fetchComplaints({ make: model.make, model: model.model, year: model.year }).catch(() => null),
    fetchRecalls({ make: model.make, model: model.model, year: model.year }).catch(() => null),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
          Common problems — the NHTSA record
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {name}: what owners report
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-2">
          Drawn from NHTSA&apos;s owner-complaint and recall records for this exact year, make,
          and model — the problems real owners filed, in their categories. It describes the
          model, not your car: a diagnosis reads your car itself.
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
            Owner complaints
          </h2>
          {complaints === null ? (
            <p className="mt-2 text-base leading-relaxed text-ink-2">
              NHTSA&apos;s complaint records couldn&apos;t be reached just now, so this section is
              unavailable rather than guessed at. Try again shortly — or run a diagnosis on your
              car, which doesn&apos;t depend on this data.
            </p>
          ) : complaints.count === 0 ? (
            <p className="mt-2 text-base leading-relaxed text-ink-1">
              NHTSA holds no owner complaints for the {name}. That&apos;s the record as it stands —
              a clean sheet on file, not a promise about any individual car.
            </p>
          ) : (
            <>
              <p className="mt-2 text-base leading-relaxed text-ink-1">
                Owners have filed {complaints.count.toLocaleString()} complaints about the {name}{" "}
                with NHTSA.
              </p>
              {complaints.topComponents.length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                    Most-reported problem areas
                  </h3>
                  <ul className="mt-2 flex list-disc flex-col gap-1 ps-5">
                    {complaints.topComponents.map((component) => (
                      <li key={component} className="text-base text-ink-1">
                        {component}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {complaints.recent.length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                    Newest complaints on file
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {complaints.recent.map((c, i) => (
                      <li key={i} className="rounded-xl bg-inset px-4 py-3">
                        <span className="font-medium text-ink-1">{c.component ?? "Complaint"}</span>
                        {c.summary && (
                          <span className="mt-1 block text-sm leading-relaxed text-ink-2">
                            {c.summary}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
            Open recalls
          </h2>
          {recalls === null ? (
            <p className="mt-2 text-base leading-relaxed text-ink-2">
              The recall record couldn&apos;t be reached just now. MECHA checks your exact VIN
              against it inside the app — that check is per-car and free.
            </p>
          ) : recalls.length === 0 ? (
            <p className="mt-2 text-base leading-relaxed text-ink-1">
              No open recalls are on file for the {name}.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {recalls.map((r, i) => (
                <li key={i} className="rounded-xl bg-inset px-4 py-3">
                  <span className="font-medium text-ink-1">{r.component ?? "Recall"}</span>
                  {r.summary && (
                    <span className="mt-1 block text-sm leading-relaxed text-ink-2">
                      {r.summary}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
          >
            Diagnose your {model.model} — 5 free
          </Link>
          <Link
            href="/codes"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-line px-6 text-base font-semibold text-ink-1"
          >
            Fault code reference
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
