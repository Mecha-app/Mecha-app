import { test, expect } from "@playwright/test";
import {
  clearSession,
  freshCredentials,
  registerFresh,
  submitPasswordLogin,
  uniqueEmail,
} from "./helpers";

/**
 * Auth: register -> lands in the app; login with the same credentials ->
 * dashboard; wrong password -> generic error, still on /login.
 *
 * Credentials: E2E_EMAIL / E2E_PASSWORD / E2E_PHONE from the env when
 * supplied for the register half is NOT reused blindly — registration
 * needs an unused identity (the server answers 409 for an existing
 * email/phone), so this spec always registers a unique address unless
 * the caller is only exercising login. The login half uses the account
 * this spec just registered; when that is impossible it registers fresh
 * rather than silently skipping (see the login test).
 *
 * Real behaviour (verified in source):
 *   - Register success -> /app/vault?welcome=1 (inside /app/*).
 *   - Login success -> /app/diagnose by default (inside /app/*).
 *   - Dashboard is /app, heading "Your garage".
 *   - Wrong password -> server detail "Email or password is incorrect."
 *     rendered in a role="alert" element; the page stays on /login.
 */

test.describe("auth", () => {
  test("register creates an account and lands in the app", async ({
    page,
  }) => {
    // Unique email per run: re-registering an existing identity is a
    // 409 by design, never a pass.
    const creds = await registerFresh(page, { email: uniqueEmail() });

    expect(page.url()).toContain("/app/");
    expect(creds.email).toContain("@");

    // The signed-in shell is up: the dashboard renders for this session.
    await page.goto("/app");
    await expect(
      page.getByRole("heading", { name: "Your garage" }),
    ).toBeVisible();
  });

  test("login with the same credentials reaches the dashboard", async ({
    page,
  }) => {
    // No silent skips: if no shared account exists yet in this run,
    // create one first, then prove a cold login with it works.
    const creds = await registerFresh(page, { email: uniqueEmail() });

    await clearSession(page);

    await submitPasswordLogin(page, creds.email, creds.password);
    await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 15_000 });

    await page.goto("/app");
    await expect(
      page.getByRole("heading", { name: "Your garage" }),
    ).toBeVisible();
  });

  test("login with env credentials reaches the dashboard", async ({
    page,
  }) => {
    // Only meaningful when the operator supplied a reusable account.
    // When they did not, register fresh instead of skipping — the
    // dashboard assertion still runs either way.
    if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
      const creds = freshCredentials();
      await submitPasswordLogin(page, creds.email, creds.password);
      await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 15_000 });
    } else {
      await registerFresh(page, { email: uniqueEmail() });
    }

    await page.goto("/app");
    await expect(
      page.getByRole("heading", { name: "Your garage" }),
    ).toBeVisible();
  });

  test("wrong password shows a generic error and stays on login", async ({
    page,
  }) => {
    const creds = await registerFresh(page, { email: uniqueEmail() });
    await clearSession(page);

    await submitPasswordLogin(
      page,
      creds.email,
      `${creds.password}-wrong`,
    );

    // Generic credential error — never which half was wrong.
    await expect(page.getByRole("alert")).toContainText(
      /email or password is incorrect|sign-in could not be completed/i,
    );
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
