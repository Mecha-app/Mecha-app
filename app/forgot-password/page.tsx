"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MinimalTopBar } from "@/components/MinimalTopBar";

/**
 * /forgot-password (0011) — MOBILE-FIRST reset start. The identifier
 * is an EMAIL or a PHONE NUMBER (owner's spec); the code itself is
 * always emailed to the address on file — there is no SMS provider,
 * and this page says so instead of implying a text is coming.
 *
 * The success state is identical whether or not an account matched —
 * the server answers the same sentence either way (anti-enumeration),
 * and this page renders exactly that sentence.
 */
export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [detail, setDetail] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setDetail("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = (await res.json()) as { detail?: string };
      if (res.ok) {
        try {
          sessionStorage.setItem("mecha-reset-identifier", identifier);
        } catch {
          // Private mode — the reset page just asks again.
        }
        setDetail(
          data.detail ??
            "If an account matches, we've emailed a reset code to the address on file.",
        );
        setState("sent");
        return;
      }
      setState("error");
      setDetail(data.detail ?? "Something went wrong. Please try again.");
    } catch {
      setState("error");
      setDetail("Something went wrong. Please try again.");
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
  const labelClass = "block text-sm font-medium text-ink-2";

  return (
    <>
      <MinimalTopBar />
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          Forgot your password?
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-2">
          Enter the email address or phone number on your account. We will email a 6-digit
          reset code to the address on file — the code always goes to your email, even when
          you start with your phone number.
        </p>

        {state === "sent" ? (
          <div className="mt-8 flex flex-col gap-5">
            <p className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink-1" role="status">
              {detail}
            </p>
            <Link
              href="/reset-password"
              className="flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
            >
              Enter your code
            </Link>
            <button
              type="button"
              onClick={() => setState("idle")}
              className="flex h-12 w-full items-center justify-center rounded-full border border-line px-6 text-base font-semibold text-ink-1"
            >
              Use a different email or phone
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
            <div>
              <label htmlFor="forgot-identifier" className={labelClass}>
                Email or phone number
              </label>
              <input
                id="forgot-identifier"
                className={inputClass}
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            {state === "error" && (
              <p className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip" role="alert">
                {detail}
              </p>
            )}

            <button
              type="submit"
              disabled={state === "sending"}
              className="h-12 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
            >
              {state === "sending" ? "Sending…" : "Email me a reset code"}
            </button>
          </form>
        )}

        <p className="mt-8 text-base text-ink-2">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-accent underline">
            Sign in
          </Link>
        </p>
      </main>
    </>
  );
}
