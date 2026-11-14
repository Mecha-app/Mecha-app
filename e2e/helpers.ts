import { expect, type Page } from "@playwright/test";

/**
 * Shared auth helpers for the MECHA e2e suite.
 *
 * Credentials come from the environment:
 *   E2E_EMAIL    — account email. When unset, a unique per-run address is
 *                  generated (e2e-<timestamp>@example.com) so registration
 *                  never collides with an account from a previous run.
 *   E2E_PASSWORD — account password. When unset, a fixed test-only
 *                  password is used for the freshly registered account.
 *   E2E_PHONE    — phone number for a phone-complete account. The
 *                  diagnosis gate refuses phone-less accounts
 *                  (`phone_required`), so specs that diagnose need this
 *                  (or the fallback test number used for fresh accounts).
 *
 * Real app behaviour these helpers are written against (verified in the
 * rebuild source, do not "simplify" without re-checking):
 *   - /register opens on the email-code door by default. The password
 *     form is behind the "Sign up with a password instead" toggle.
 *   - The register form fields are Name / Email / Phone (optional) /
 *     Password / Confirm password, submit "Create account". A successful
 *     registration lands in the app on /app/vault?welcome=1.
 *   - /login shows the email-code door AND the password form on the same
 *     page, so "Email" appears twice — the password form is scoped by
 *     the form that contains the Password field.
 *   - A successful password login lands in the app (default
 *     /app/diagnose; a stored return-to can send it elsewhere under
 *     /app/). The dashboard itself is /app ("Your garage").
 *   - The session lives in localStorage (`mechaToken` / `mechaUser`);
 *     clearing those keys is a reliable sign-out for test isolation.
 */

export interface E2ECredentials {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 100_000)}@example.com`;
}

/** Credentials for a brand-new account, honouring env overrides. */
export function freshCredentials(
  overrides: Partial<E2ECredentials> = {},
): E2ECredentials {
  return {
    name: overrides.name ?? "E2E Test Driver",
    email: overrides.email ?? process.env.E2E_EMAIL ?? uniqueEmail(),
    password:
      overrides.password ?? process.env.E2E_PASSWORD ?? "E2eTest!2026",
    // A complete (diagnosis-eligible) account needs a phone on file.
    // 555-01xx numbers are reserved for fictional/test use.
    phone: overrides.phone ?? process.env.E2E_PHONE ?? "6175550142",
  };
}

/** True when the operator supplied a reusable account via the env. */
export function hasEnvCredentials(): boolean {
  return Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
}

/** Remove the stored session so the next navigation is signed out. */
export async function clearSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      localStorage.removeItem("mechaToken");
      localStorage.removeItem("mechaUser");
      sessionStorage.clear();
    } catch {
      // Storage unavailable — nothing to clear.
    }
  });
}

/**
 * Register a fresh account through the password door and land in the app.
 * Returns the credentials that were used.
 */
export async function registerFresh(
  page: Page,
  overrides: Partial<E2ECredentials> = {},
): Promise<E2ECredentials> {
  const creds = freshCredentials(overrides);

  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();

  // The default door is email-code; switch to the password form.
  // Copy verified: dictionary `auth.register.passwordInstead`.
  const toggle = page.getByRole("button", {
    name: "Sign up with a password instead",
  });
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
  }

  await page.getByLabel("Name", { exact: true }).fill(creds.name);
  await page.getByLabel("Email", { exact: true }).fill(creds.email);
  // Label copy is "Phone (optional)" in the current build — the number is
  // optional at sign-up but required before a first diagnosis, and this
  // helper is for complete accounts, so it is always filled.
  await page.getByLabel(/phone/i).fill(creds.phone);
  await page.getByLabel("Password", { exact: true }).fill(creds.password);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill(creds.password);

  await page.getByRole("button", { name: "Create account" }).click();

  // Success lands in the app (onboarding: /app/vault?welcome=1).
  await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 15_000 });
  return creds;
}

/**
 * Fill and submit the password form on /login for the given credentials.
 * Does not assert the outcome — callers decide what success/failure is.
 */
export async function submitPasswordLogin(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();

  // /login renders two email fields (email-code door + password form).
  // Scope every field to the <form> that contains the Password field.
  const passwordField = page.getByLabel("Password", { exact: true });
  const form = page.locator("form").filter({ has: passwordField });
  await form.getByLabel("Email", { exact: true }).fill(email);
  await passwordField.fill(password);
  await form.getByRole("button", { name: "Sign in" }).click();
}

/**
 * Sign in with the env credentials, or — when no reusable env account
 * was supplied — register a fresh phone-complete account instead.
 * Either way the page ends up signed in, inside /app/*.
 */
export async function signIn(
  page: Page,
  overrides: Partial<E2ECredentials> = {},
): Promise<E2ECredentials> {
  if (hasEnvCredentials() && !overrides.email && !overrides.password) {
    const creds = freshCredentials();
    await submitPasswordLogin(page, creds.email, creds.password);
    await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 15_000 });
    return creds;
  }
  return registerFresh(page, overrides);
}
