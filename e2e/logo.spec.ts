import { test, expect, type Page } from "@playwright/test";
import { registerFresh, uniqueEmail } from "./helpers";

/**
 * Logo-to-main-page, behavioral (Pass #12, 2026-11-16).
 *
 * The unit pins in tests/logo.test.ts guard the source contract;
 * this spec guards the rendered behavior that the owner actually
 * reported broken: signed in on his phone, tapping the logo on a
 * public page took him to the marketing homepage — and on the
 * homepage itself the tap did nothing at all — instead of taking
 * him to his main page, the dashboard.
 *
 * Contract under test:
 *   - signed out: the header logo targets "/" and navigates there;
 *   - signed in: the header logo targets "/app" on public pages,
 *     on the homepage, and inside the app shell — and lands on the
 *     dashboard ("Your garage").
 *
 * The logo anchor is found by its accessible name (dictionary
 * header.logoHomeLabel "MECHA — home" / logoAppLabel
 * "MECHA — app home") scoped to the page header.
 */

function headerLogo(page: Page) {
  return page
    .locator("header")
    .first()
    .getByRole("link", { name: /MECHA/ })
    .first();
}

async function pathname(page: Page): Promise<string> {
  return new URL(page.url()).pathname;
}

test.describe("logo home link", () => {
  test("signed out: logo on a public page goes to /", async ({ page }) => {
    await page.goto("/pricing");
    const logo = headerLogo(page);
    await expect(logo).toHaveAttribute("href", "/");
    await logo.click();
    await expect.poll(() => pathname(page)).toBe("/");
  });

  test("signed in: logo on a public page goes to the dashboard", async ({ page }) => {
    await registerFresh(page, { email: uniqueEmail() });
    await page.goto("/pricing");
    const logo = headerLogo(page);
    await expect(logo).toHaveAttribute("href", "/app");
    await logo.click();
    await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Your garage" }),
    ).toBeVisible();
  });

  test("signed in: logo on the homepage goes to the dashboard (was a no-op tap)", async ({
    page,
  }) => {
    await registerFresh(page, { email: uniqueEmail() });
    await page.goto("/");
    const logo = headerLogo(page);
    await expect(logo).toHaveAttribute("href", "/app");
    await logo.click();
    await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Your garage" }),
    ).toBeVisible();
  });

  test("signed in: logo inside the app goes to the dashboard", async ({ page }) => {
    await registerFresh(page, { email: uniqueEmail() });
    await page.goto("/app/scan");
    const logo = headerLogo(page);
    await expect(logo).toHaveAttribute("href", "/app");
    await logo.click();
    await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Your garage" }),
    ).toBeVisible();
  });
});
