"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

/**
 * Email-only waitlist capture (blueprint route `/` finale — the waitlist IS
 * an email, never a forced full registration; audit correction).
 * WP2: posts to the /api/waitlist stub, which validates and answers 501 —
 * the honest "not stored yet" state is surfaced, never faked. WP3 persists
 * to Neon `waitlist_signups` and this same form starts returning success.
 */
export function WaitlistForm() {
  const { t } = useLocale();
  const w = t.waitlist;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "invalid" | "stub">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setState("invalid");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 202) setState("done");
      else if (res.status === 400) setState("invalid");
      else setState("stub");
    } catch {
      setState("stub");
    }
  }

  return (
    <section id="waitlist" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{w.eyebrow}</p>
          <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
            {w.heading}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">{w.body}</p>

          {state === "done" ? (
            <p className="mx-auto mt-10 max-w-xl rounded-2xl border border-line bg-surface px-5 py-4 font-medium text-verdict-fair" role="status">
              {w.success}
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mx-auto mt-10 max-w-xl" noValidate>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="waitlist-email" className="sr-only">
                  {w.placeholder}
                </label>
                <input
                  id="waitlist-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={w.placeholder}
                  className="h-14 flex-1 rounded-full border border-line bg-inset px-6 text-ink-1 placeholder:text-ink-3 focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={state === "sending"}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-[var(--color-accent-ink)] transition-colors duration-150 hover:bg-accent-bright disabled:opacity-60"
                >
                  {w.button}
                </button>
              </div>
              {state === "invalid" && (
                <p className="mt-3 text-sm text-verdict-rip" role="alert">
                  {w.errorInvalid}
                </p>
              )}
              {state === "stub" && (
                <p className="mt-3 text-sm text-verdict-warn" role="alert">
                  {w.errorStub}
                </p>
              )}
              <p className="mt-3 text-[13px] text-ink-3">{w.note}</p>
            </form>
          )}
        </div>
        </Reveal>
      </div>
    </section>
  );
}
