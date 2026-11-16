import { test, expect } from "@playwright/test";

/**
 * Public (signed-out) surfaces: homepage, pricing, the /diagnose product
 * page, and the 404 for an unknown route.
 *
 * Copy asserted here is the app's real English copy, verified in the
 * rebuild source:
 *   - Hero (lib/i18n `hero`): "Know what's wrong." / "Know what it
 *     should cost.", primary CTA "Scan your car" -> /app/scan.
 *   - Pricing tiers (lib/i18n `pricing`): Free $0 / Pro $9.99 /
 *     Shops $149.
 *   - /diagnose product page (lib/i18n `diagnosePage`): heading
 *     "Start with the symptom. Leave with a plan.", primary CTA
 *     "Diagnose my car".
 */

test.describe("public pages", () => {
  test("homepage loads with hero and primary CTA", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText("Know what's wrong.");
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText("Know what it should cost.");

    const primaryCta = page.getByRole("link", { name: "Scan your car" });
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveAttribute("href", "/app/scan");

    // The standing offer is on the first screen.
    await expect(
      page.getByText("First 5 diagnoses free — no card required"),
    ).toBeVisible();
  });

  test("/pricing shows all three tiers with $9.99 and $149", async ({
    page,
  }) => {
    await page.goto("/pricing");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // All three tier names.
    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shops" })).toBeVisible();

    // And their prices — the two paid prices are the contract.
    await expect(page.getByText("$9.99", { exact: true })).toBeVisible();
    await expect(page.getByText("$149", { exact: true })).toBeVisible();
    await expect(page.getByText("$0", { exact: true })).toBeVisible();
  });

  test("/diagnose product page renders", async ({ page }) => {
    await page.goto("/diagnose");

    await expect(
      page.getByRole("heading", {
        name: "Start with the symptom. Leave with a plan.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Diagnose my car" }).first(),
    ).toBeVisible();
  });

  test("unknown route shows 404", async ({ page }) => {
    const response = await page.goto("/e2e-no-such-route-404");

    expect(response?.status()).toBe(404);
    // Next.js default not-found copy; there is no custom not-found page
    // in the app, so accept either the status-page wording or a plain
    // "not found" message.
    await expect(page.locator("body")).toContainText(
      /404|not found/i,
    );
  });
});
