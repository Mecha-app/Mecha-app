import { test, expect, type Page } from "@playwright/test";
import { registerFresh, uniqueEmail } from "./helpers";

/**
 * Logo-to-main-page, behavioral (Pass #17, 2026-11-17).
 *
 * The unit pins in tests/logo.test.ts guard the source contract;
 * this spec guards the rendered behavior behind the owner's rule,
 * repeated Nov 16–17: "if you click on the logo, it should take
 * you back to the main page."
 *
 * Contract under test — ONE target for everyone:
 *   - signed out: the header logo targets "/" and navigates there;
 *   - signed in: the header logo STILL targets "/" — on public
 *     pages, on the homepage, and inside the app shell — and lands
 *     on the main page (the homepage, "Your AI mechanic copilot.").
 *
 * History: Pass #12 (2026-11-16) made the signed-in target "/app"
 * (the dashboard); the owner then tested on /app itself, where
 * that logo was a self-link and the tap visibly did nothing —
 * "it does not work… to take me to the main page." Pass #17
 * reverts to the uniform rule.
 *
 * The logo anchor is found by its accessible name (dictionary
 * header.logoHomeLabel "MECHA — home") scoped to the page header.
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

  test("signed in: logo on a public page goes to the main page", async ({ page }) => {
    await registerFresh(page, { email: uniqueEmail() });
    await page.goto("/pricing");
    const logo = headerLogo(page);
    await expect(logo).toHaveAttribute("href", "/");
    await logo.click();
    await expect.poll(() => pathname(page)).toBe("/");
    await expect(
      page.getByRole("heading", { name: "Your AI mechanic copilot." }),
    ).toBeVisible();
  });

  test("signed in: logo on the homepage targets the main page", async ({ page }) => {
    await registerFresh(page, { email: uniqueEmail() });
    await page.goto("/");
    const logo = headerLogo(page);
    await expect(logo).toHaveAttribute("href", "/");
  });

  test("signed in: logo inside the app goes to the main page", async ({ page }) => {
    await registerFresh(page, { email: uniqueEmail() });
    await page.goto("/app/scan");
    const logo = headerLogo(page);
    await expect(logo).toHaveAttribute("href", "/");
    await logo.click();
    await expect.poll(() => pathname(page)).toBe("/");
    await expect(
      page.getByRole("heading", { name: "Your AI mechanic copilot." }),
    ).toBeVisible();
  });
});
