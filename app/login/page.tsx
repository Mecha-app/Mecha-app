"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { SocialSignIn } from "@/components/SocialSignIn";
import { saveSession } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { RETURN_TO_KEY } from "@/lib/server/scan";

/**
 * Where a successful sign-in lands: the page that sent the visitor
 * here (e.g. /app/scan sets a return-to before bouncing), else the
 * diagnosis screen. Only in-app paths are honored, and the key is
 * cleared on use so it can never redirect a later sign-in.
 */
function postAuthDestination(): string {
  try {
    const target = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    if (target && target.startsWith("/app/")) return target;
  } catch {
    // Private mode — default destination.
  }
  return "/app/diagnose";
}

/**
 * /login (WP5) — MOBILE-FIRST sign-in. Signing back in returns you to
 * the SAME account and the SAME diagnosis count — that is the point of
 * the server-side identity: nothing resets, ever.
 */
export default function LoginPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [detail, setDetail] = useState("");
  const [googleFailed, setGoogleFailed] = useState(false);

  // Google sign-in returns here with ?error=google on ANY failure
  // (the callback deliberately carries no provider detail) — show the
  // one generic, honest message.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "google") setGoogleFailed(true);
    } catch {
      // No query to read — the plain form.
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setDetail("");
    setGoogleFailed(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: Parameters<typeof saveSession>[1];
        detail?: string;
        error?: string;
      };
      if (res.ok && data.token && data.user) {
        saveSession(data.token, data.user);
        window.location.href = postAuthDestination();
        return;
      }
      setState("error");
      // A Google-only account gets the specific, honest answer from
      // the dictionary — never a misleading "wrong password."
      if (data.error === "google_signin_required") {
        setDetail(t.auth.social.googleOnly);
        return;
      }
      setDetail(data.detail ?? "Sign-in could not be completed. Please try again.");
    } catch {
      setState("error");
      setDetail("Sign-in could not be completed. Please try again.");
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
  const labelClass = "block text-sm font-medium text-ink-2";

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
        Welcome back
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-2">
        Sign in to your account — your cars, your history, and your remaining free diagnoses
        are right where you left them.
      </p>

      <SocialSignIn />

      {googleFailed && (
        <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip" role="alert">
          {t.auth.social.failed}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className={inputClass}
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className={inputClass}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="mt-2 text-sm">
            <Link href="/forgot-password" className="font-medium text-accent underline">
              Forgot password?
            </Link>
          </p>
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
          {state === "sending" ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-base text-ink-2">
        New to MECHA?{" "}
        <Link href="/register" className="font-semibold text-accent underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
