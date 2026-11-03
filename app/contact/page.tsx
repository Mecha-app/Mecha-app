"use client";

import { useState, type FormEvent } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

/**
 * Route `/contact` (blueprint route 9) — built in the dead-link sweep:
 * the footer linked here and the route did not exist.
 *
 * Honesty note: the legacy contact form faked its send (a "Message
 * Sent!" state with nothing behind it — the same class of fake as the
 * old waitlist). This rebuild has no mail-sending backend route yet,
 * so the form does the real thing available today: it composes the
 * message in the visitor's own email app, addressed to the support
 * mailbox — and says exactly that on the button. The mailboxes below
 * are the company's published addresses (support from the legacy
 * contact page; privacy and legal from the published policies).
 * A server-side form lands with the mail plumbing (STATUS, WP6 list).
 */

const MAILBOXES = [
  {
    title: "Support",
    email: "support@mechaai.com",
    description: "For all questions, issues, and inquiries",
  },
  {
    title: "Privacy",
    email: "privacy@mechaai.com",
    description: "Access, update, or delete your account data",
  },
  {
    title: "Legal",
    email: "legal@mechaai.com",
    description: "Questions about the Terms of Service",
  },
];

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
const labelCls = "block text-sm font-medium text-ink-2";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = [`Name: ${name}`, `Email: ${email}`, "", message].join("\n");
    const href = `mailto:support@mechaai.com?subject=${encodeURIComponent(
      subject || "Message from the MECHA contact page",
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">Get in touch</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.01em] text-ink-1">
          Contact MECHA
        </h1>

        <div className="mt-10 grid items-start gap-12 lg:grid-cols-2">
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className={labelCls}>
                  Name
                </label>
                <input
                  id="contact-name"
                  className={inputCls}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="contact-email" className={labelCls}>
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className={inputCls}
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="contact-subject" className={labelCls}>
                Subject
              </label>
              <input
                id="contact-subject"
                className={inputCls}
                placeholder="How can we help?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="contact-message" className={labelCls}>
                Message
              </label>
              <textarea
                id="contact-message"
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base leading-relaxed text-ink-1 placeholder:text-ink-3"
                placeholder="Tell us what you need…"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="h-12 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
            >
              Send via your email app
            </button>
            <p className="text-sm leading-relaxed text-ink-3">
              The button opens your email app with this message addressed to our support team —
              nothing is sent from this page itself.
            </p>
          </form>

          <div className="flex flex-col gap-6">
            {MAILBOXES.map((box) => (
              <div key={box.email} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-xs font-bold tracking-wide text-accent">
                  {box.title.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-ink-1">{box.title}</p>
                  <a
                    href={`mailto:${box.email}`}
                    className="text-base font-medium text-accent underline"
                  >
                    {box.email}
                  </a>
                  <p className="mt-0.5 text-sm text-ink-2">{box.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
