"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { saveSession } from "@/lib/client/auth";
import { MinimalTopBar } from "@/components/MinimalTopBar";

/**
 * /reset-password (0011) — MOBILE-FIRST reset completion: the same
 * email-or-phone identifier, the 6-digit code from the email, and the
 * new password. Success signs the person straight back in (the API
 * returns the standard auth payload). Every failure shows the one
 * generic code error — the page never learns which part was wrong.
 */
export default function ResetPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("mecha-reset-identifier");
      if (saved) setIdentifier(saved);
    } catch {
      // Private mode — the field just starts empty.
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setDetail("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, code, password }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: Parameters<typeof saveSession>[1];
        detail?: string;
      };
      if (res.ok && data.token && data.user) {
        saveSession(data.token, data.user);
        try {
          sessionStorage.removeItem("mecha-reset-identifier");
        } catch {
          // Nothing to clean up.
        }
        window.location.href = "/app";
        return;
      }
      setState("error");
      setDetail(data.detail ?? "That code doesn't match, or it has expired.");
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
          Set a new password
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-2">
          Enter the same email or phone number you started with, the 6-digit code from your
          email, and your new password.
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="reset-identifier" className={labelClass}>
              Email or phone number
            </label>
            <input
              id="reset-identifier"
              className={inputClass}
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="reset-code" className={labelClass}>
              Reset code
            </label>
            <input
              id="reset-code"
              className={`${inputClass} font-mono`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <p className="mt-2 text-sm text-ink-3">The code lasts 15 minutes and works once.</p>
          </div>
          <div>
            <label htmlFor="reset-password" className={labelClass}>
              New password
            </label>
            <input
              id="reset-password"
              type="password"
              className={inputClass}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="mt-2 text-sm text-ink-3">At least 8 characters.</p>
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
            {state === "sending" ? "Saving…" : "Set password and sign in"}
          </button>
        </form>

        <p className="mt-8 text-base text-ink-2">
          No code yet?{" "}
          <Link href="/forgot-password" className="font-semibold text-accent underline">
            Request one
          </Link>
        </p>
      </main>
    </>
  );
}
