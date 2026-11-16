"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { MinimalTopBar } from "@/components/MinimalTopBar";
import { getStoredUser, getToken, saveSession, type StoredUser } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /app/complete-profile — profile completion for accounts created
 * through Google sign-in, which start with NO phone on file. The
 * owner's quota identity is email AND phone: until the number is
 * added the account cannot run a diagnosis (diagnoseService refuses,
 * and the diagnose page routes here), because a phone-less identity
 * could be re-created to reset the free count.
 *
 * Minimal chrome by design — one question, one button. A number that
 * already belongs to a different account answers the server's honest
 * conflict (shown verbatim); accounts are never merged silently.
 */
export default function CompleteProfilePage() {
  const { t } = useLocale();
  const copy = t.auth.completeProfile;
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    const stored = getStoredUser();
    if (stored?.phone) setPhone(stored.phone);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setDetail("");
    const res = await apiFetch<{ token: string; user: StoredUser }>("/api/auth/complete-phone", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    if (res.status === 200 && res.data.token && res.data.user) {
      saveSession(res.data.token, res.data.user);
      window.location.href = "/app/diagnose";
      return;
    }
    setState("error");
    setDetail(apiDetail(res.data, copy.failed));
  }

  return (
    <>
      <MinimalTopBar />
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {copy.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-2">{copy.body}</p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="complete-phone" className="block text-sm font-medium text-ink-2">
              {copy.phoneLabel}
            </label>
            <input
              id="complete-phone"
              type="tel"
              className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            disabled={state === "sending" || phone.trim().length === 0}
            className="h-12 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
          >
            {state === "sending" ? copy.saving : copy.submit}
          </button>
        </form>
      </main>
    </>
  );
}
