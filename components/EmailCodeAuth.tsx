"use client";

import { useState, type FormEvent } from "react";
import { saveSession } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type SessionUser = Parameters<typeof saveSession>[1];

/**
 * Email-code auth (0013) — the big-brand one-door flow shared by
 * /register and /login: type an email, get a 6-digit code, and the
 * code does the rest. Existing accounts are SIGNED IN by the code;
 * new emails are walked into account creation (name + password typed
 * twice + optional phone) with the account created already verified.
 * The mode only changes the intro copy — the door itself is the same,
 * so neither page can become a dead end for the other crowd.
 */
export function EmailCodeAuth({
  mode,
  getDestination,
}: {
  mode: "register" | "login";
  getDestination: () => string;
}) {
  const { t } = useLocale();
  const [step, setStep] = useState<"email" | "code" | "details">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const inputClass =
    "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
  const labelClass = "block text-sm font-medium text-ink-2";
  const primaryButton =
    "h-12 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60";

  function finish(token: string, user: SessionUser) {
    saveSession(token, user);
    window.location.href = getDestination();
  }

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { detail?: string };
      if (res.ok) {
        setStep("code");
        setNotice(t.auth.code.codeSent);
        return;
      }
      setError(data.detail ?? "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/email-code/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as {
        kind?: string;
        ticket?: string;
        token?: string;
        user?: SessionUser;
        detail?: string;
        error?: string;
      };
      if (res.ok && data.kind === "signed_in" && data.token && data.user) {
        finish(data.token, data.user);
        return;
      }
      if (res.ok && data.kind === "signup_verified" && data.ticket) {
        setTicket(data.ticket);
        setStep("details");
        return;
      }
      if (data.error === "invalid_code") {
        setError(t.auth.code.invalid);
        return;
      }
      setError(data.detail ?? "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setNotice(t.auth.code.resent);
    } catch {
      setNotice(t.auth.code.resent);
    } finally {
      setBusy(false);
    }
  }

  async function onDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    // Password verified twice (owner's rule) — caught here before
    // the request leaves the browser, and again by the service.
    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/email-code/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticket,
          name,
          phone: phone || undefined,
          password,
          confirmPassword,
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: SessionUser;
        detail?: string;
        error?: string;
      };
      if (res.status === 201 && data.token && data.user) {
        finish(data.token, data.user);
        return;
      }
      if (res.status === 400 && data.error === "password_mismatch") {
        setMismatch(true);
        return;
      }
      if (res.status === 400 && data.error === "invalid_code") {
        // The ticket's 15 minutes ran out — restart the door.
        setError(t.auth.code.invalid);
        setStep("email");
        setCode("");
        return;
      }
      setError(data.detail ?? "Sign-up could not be completed. Please try again.");
    } catch {
      setError("Sign-up could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const alertBox =
    "rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip";
  const noticeBox =
    "rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink-1";

  return (
    <div className="mt-8">
      <p className="text-base leading-relaxed text-ink-2">
        {mode === "register" ? t.auth.code.registerIntro : t.auth.code.loginIntro}
      </p>

      {step === "email" && (
        <form onSubmit={onEmailSubmit} className="mt-5 flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor={`code-email-${mode}`} className={labelClass}>
              {t.auth.code.emailLabel}
            </label>
            <input
              id={`code-email-${mode}`}
              type="email"
              className={inputClass}
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className={alertBox} role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? t.auth.code.sending : t.auth.code.continueCta}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onCodeSubmit} className="mt-5 flex flex-col gap-5" noValidate>
          {notice && (
            <p className={noticeBox} role="status">
              {notice}
            </p>
          )}
          <div>
            <label htmlFor={`code-value-${mode}`} className={labelClass}>
              {t.auth.code.codeLabel}
            </label>
            <input
              id={`code-value-${mode}`}
              className={inputClass}
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className={alertBox} role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? t.auth.code.verifying : t.auth.code.verifyCta}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={busy}
              onClick={onResend}
              className="font-medium text-accent underline disabled:opacity-60"
            >
              {t.auth.code.resend}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
                setNotice("");
              }}
              className="font-medium text-accent underline disabled:opacity-60"
            >
              {t.auth.code.differentEmail}
            </button>
          </div>
        </form>
      )}

      {step === "details" && (
        <form onSubmit={onDetailsSubmit} className="mt-5 flex flex-col gap-5" noValidate>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-1">
              {t.auth.code.newHereTitle}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-ink-2">{t.auth.code.newHereBody}</p>
          </div>
          <div>
            <label htmlFor={`code-name-${mode}`} className={labelClass}>
              Name
            </label>
            <input
              id={`code-name-${mode}`}
              className={inputClass}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`code-phone-${mode}`} className={labelClass}>
              {t.auth.register.phoneOptional}
            </label>
            <input
              id={`code-phone-${mode}`}
              type="tel"
              className={inputClass}
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="mt-2 text-sm text-ink-3">{t.auth.register.phoneOptionalHint}</p>
          </div>
          <div>
            <label htmlFor={`code-password-${mode}`} className={labelClass}>
              Password
            </label>
            <input
              id={`code-password-${mode}`}
              type="password"
              className={inputClass}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (mismatch) setMismatch(false);
              }}
              required
            />
            <p className="mt-2 text-sm text-ink-3">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor={`code-password-confirm-${mode}`} className={labelClass}>
              {t.auth.register.confirmPassword}
            </label>
            <input
              id={`code-password-confirm-${mode}`}
              type="password"
              className={inputClass}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (mismatch) setMismatch(false);
              }}
              required
            />
          </div>
          {mismatch && (
            <p className={alertBox} role="alert">
              {t.auth.register.passwordMismatch}
            </p>
          )}
          {error && (
            <p className={alertBox} role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? t.auth.code.creating : t.auth.code.createCta}
          </button>
        </form>
      )}
    </div>
  );
}
