"use client";

import { useEffect, useState, type FormEvent } from "react";
import { authHeaders } from "@/lib/client/auth";
import { canShareReport, shareReport } from "@/lib/client/nativeShell";

/**
 * Share this report (Pass #20) — mints the public report-card link
 * for the diagnosis that just finished (POST /api/diagnoses/[id]/
 * share) and offers the two ways out: copy the link, or email it
 * through MECHA's mailer. The card behind the link shows only the
 * report summary; this component says so in plain words, and the
 * email result is reported exactly as the server states it.
 */
export default function DiagnosisShare({
  diagnosisId,
  initialShareUrl,
}: {
  diagnosisId: string;
  /** The link already minted for this diagnosis, when one exists
   * (Pass #20c) — the control opens on the link itself instead of
   * reverting to "Create share link" on every page load. */
  initialShareUrl?: string;
}) {
  const [url, setUrl] = useState(initialShareUrl ?? "");
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // A share-sheet path (the native shell, or a browser with the Web
  // Share API) is detected after mount — the button simply never
  // appears where no share path exists, and copy/email carry on.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(canShareReport());
  }, []);

  async function onShare() {
    const shared = await shareReport({
      title: "My MECHA diagnosis report",
      text: "My MECHA diagnosis report — the verdict and the fair-price range:",
      url,
    });
    if (!shared) void onCopy();
  }

  async function mint(withEmail: boolean) {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch(`/api/diagnoses/${diagnosisId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify(withEmail && email.trim() ? { email: email.trim() } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        emailDelivery?: string | null;
        detail?: string;
      };
      if (!res.ok || !data.url) {
        setNote(data.detail ?? "The share link could not be created. Please try again.");
        return;
      }
      setUrl(data.url);
      if (withEmail) {
        setNote(
          data.emailDelivery === "sent"
            ? "Link created and emailed."
            : data.emailDelivery === "not_configured"
              ? "Link created. Email isn't set up on MECHA right now — copy the link instead."
              : "Link created. The email didn't go through — copy the link instead.",
        );
      }
    } catch {
      setNote("The share link could not be created. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // The link is visible in the field to copy by hand.
    }
  }

  function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim()) void mint(true);
  }

  return (
    <section
      className="mt-6 rounded-2xl border border-line bg-surface px-5 py-6"
      aria-label="Share this report"
    >
      <h3 className="font-display text-xl font-semibold text-ink-1">Share this report</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">
        A clean card with the vehicle, the verdict, and the fair-price range — anyone with the
        link can view it. It never shows your account or contact details.
      </p>

      {!url ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void mint(false)}
          className="mt-4 flex h-12 items-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create share link"}
        </button>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              readOnly
              value={url}
              aria-label="Share link"
              className="h-12 w-full flex-1 rounded-xl border border-line bg-inset px-4 font-mono text-sm text-ink-1"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={() => void onCopy()}
              className="flex h-12 shrink-0 items-center justify-center rounded-full border border-line px-5 text-base font-semibold text-ink-1"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            {canShare && (
              <button
                type="button"
                onClick={() => void onShare()}
                className="flex h-12 shrink-0 items-center justify-center rounded-full border border-line px-5 text-base font-semibold text-ink-1"
              >
                Share…
              </button>
            )}
          </div>
          <form onSubmit={onEmailSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email it to…"
              aria-label="Email the share link to"
              className="h-12 w-full flex-1 rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="flex h-12 shrink-0 items-center justify-center rounded-full border border-line px-5 text-base font-semibold text-ink-1 disabled:opacity-60"
            >
              Email the link
            </button>
          </form>
        </>
      )}
      {note && (
        <p className="mt-3 text-sm text-ink-2" role="status">
          {note}
        </p>
      )}
    </section>
  );
}
