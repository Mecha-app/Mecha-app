"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { SocialSignIn } from "@/components/SocialSignIn";
import { saveSession } from "@/lib/client/auth";
import { RETURN_TO_KEY } from "@/lib/server/scan";

/**
 * Where a successful registration lands: the page that sent the
 * visitor here (e.g. /app/scan sets a return-to before bouncing to
 * sign-in) still wins — that flow had an intent. Otherwise the owner
 * ordered onboarding: land on "Add your first vehicle" (the vault add
 * form in welcome mode, with a clear Skip — never a trap). Only
 * in-app paths are honored, and the key is cleared on use.
 */
function postAuthDestination(): string {
  try {
    const target = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    if (target && target.startsWith("/app/")) return target;
  } catch {
    // Private mode — default destination.
  }
  return "/app/vault?welcome=1";
}

/**
 * /register (WP5) — driver account creation, MOBILE-FIRST: designed at
 * phone width (the roadside reality), desktop second. Single column,
 * 48px+ touch targets, 16px inputs (no iOS focus zoom).
 *
 * Identity rule surfaced honestly: if the email or phone already has an
 * account, the server answers 409 and this page says "sign in instead" —
 * because the existing account (and its diagnosis count) is the
 * person's one identity. Nothing is ever silently reset.
 */
export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "conflict" | "error">("idle");
  const [detail, setDetail] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setDetail("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || undefined, password }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: Parameters<typeof saveSession>[1];
        detail?: string;
      };
      if (res.status === 201 && data.token && data.user) {
        saveSession(data.token, data.user);
        window.location.href = postAuthDestination();
        return;
      }
      if (res.status === 409) {
        setState("conflict");
        setDetail(
          data.detail ??
            "An account already exists for this email or phone number — sign in instead.",
        );
        return;
      }
      setState("error");
      setDetail(data.detail ?? "Registration could not be completed. Please try again.");
    } catch {
      setState("error");
      setDetail("Registration could not be completed. Please try again.");
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
  const labelClass = "block text-sm font-medium text-ink-2";

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
        Create your account
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-2">
        Your first 5 diagnoses are free. After that, MECHA Pro keeps you covered — we will
        always tell you exactly how many free diagnoses you have left.
      </p>

      <SocialSignIn />

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor="reg-name" className={labelClass}>
            Name
          </label>
          <input
            id="reg-name"
            className={inputClass}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="reg-email" className={labelClass}>
            Email
          </label>
          <input
            id="reg-email"
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
          <label htmlFor="reg-phone" className={labelClass}>
            Phone
          </label>
          <input
            id="reg-phone"
            type="tel"
            className={inputClass}
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="reg-password" className={labelClass}>
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            className={inputClass}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="mt-2 text-sm text-ink-3">At least 8 characters.</p>
        </div>

        {state === "conflict" && (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink-1" role="alert">
            {detail}{" "}
            <Link href="/login" className="font-semibold text-accent underline">
              Sign in
            </Link>
          </p>
        )}
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
          {state === "sending" ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-base text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
