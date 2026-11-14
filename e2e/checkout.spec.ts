import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Checkout: choose Pro and assert the STRIPE RULE.
 *
 * Real behaviour (verified in source — read carefully, the marketing
 * page is NOT where checkout starts):
 *   - On /pricing, the Pro tier's CTA is "Go Pro" and it is a plain
 *     link to /register — there is no checkout button on /pricing.
 *   - The real Pro checkout lives on the signed-in dashboard (/app) in
 *     the Plan & billing section: "Upgrade to Pro — $9.99/mo"
 *     (components/BillingSection.tsx). It POSTs
 *     /api/payments/create-checkout with { plan: "pro" } and, on a
 *     { url } response, navigates the browser to that URL.
 *   - When Stripe IS wired: the URL is a Stripe-hosted checkout URL
 *     (checkout.stripe.com). This spec asserts that and STOPS — it
 *     never enters card or any other payment details.
 *   - When Stripe is NOT wired: the API answers 501
 *     stripe_not_configured ("Payments are not wired in this
 *     environment yet — no checkout was created.") and the dashboard
 *     shows that detail in a role="alert". If billing itself is
 *     unavailable, the section instead states "Billing isn't wired up
 *     in this preview yet" and offers no upgrade button — that is also
 *     the honest state, and also a pass.
 *
 * So the spec starts at /pricing (asserts the Pro tier, follows the
 * "choosing Pro" intent), then performs the actual checkout attempt
 * from the dashboard billing section and accepts exactly the two
 * honest outcomes above.
 */

test.describe("checkout (Pro)", () => {
  test("choosing Pro redirects to Stripe checkout or shows the honest not-configured state", async ({
    page,
  }) => {
    await signIn(page);

    // Start where a customer starts: /pricing, Pro tier present.
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByText("$9.99", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go Pro" }),
    ).toBeVisible();

    // The actual checkout trigger is the dashboard billing section.
    const checkoutResponse = page
      .waitForResponse(
        (res) =>
          res.url().includes("/api/payments/create-checkout") &&
          res.request().method() === "POST",
        { timeout: 15_000 },
      )
      .catch(() => null);

    await page.goto("/app");
    await expect(
      page.getByRole("heading", { name: "Your garage" }),
    ).toBeVisible();

    const upgradeButton = page.getByRole("button", {
      name: /Upgrade to Pro/,
    });
    const billingUnavailable = page.getByText(
      /Billing isn't wired up in this preview yet/i,
    );

    // Free accounts get the upgrade button; already-Pro accounts get a
    // manage button instead (nothing to check out — that is a pass for
    // an env account that is already subscribed).
    await expect
      .poll(
        async () =>
          (await upgradeButton.isVisible().catch(() => false)) ||
          (await billingUnavailable.isVisible().catch(() => false)) ||
          (await page
            .getByRole("button", { name: /Manage or cancel/i })
            .isVisible()
            .catch(() => false)),
        { timeout: 15_000 },
      )
      .toBe(true);

    if (await billingUnavailable.isVisible().catch(() => false)) {
      // Honest not-configured state at the billing layer — pass, and
      // there must be no checkout navigation.
      expect(page.url()).not.toContain("checkout.stripe.com");
      return;
    }

    if (!(await upgradeButton.isVisible().catch(() => false))) {
      // Already on a paid plan (manage/portal button shown): no
      // checkout to start. Nothing fake was presented — pass.
      return;
    }

    await upgradeButton.click();
    const response = await checkoutResponse;

    // Outcome A: Stripe is wired — the API returned a checkout URL and
    // the browser is heading to Stripe-hosted checkout. Assert and
    // STOP. Never enter payment details.
    // Outcome B: Stripe is not wired — 501 stripe_not_configured and
    // the honest detail is shown in an alert; still on our origin.
    await expect
      .poll(
        async () => {
          if (page.url().includes("checkout.stripe.com")) return "stripe";
          const alert = page
            .getByRole("alert")
            .filter({
              hasText: /not wired|not configured|no checkout was created/i,
            });
          if (await alert.isVisible().catch(() => false)) return "honest";
          return "waiting";
        },
        { timeout: 20_000, intervals: [500, 1_000] },
      )
      .not.toBe("waiting");

    if (page.url().includes("checkout.stripe.com")) {
      expect(page.url()).toMatch(/^https:\/\/checkout\.stripe\.com\//);
      // STOP HERE — do not fill any Stripe form.
      return;
    }

    // Honest state: confirm the API (when observed) said so, and that
    // no fake checkout was presented on our own pages.
    if (response) {
      expect([200, 501]).toContain(response.status());
      if (response.status() === 501) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        expect(body.error).toBe("stripe_not_configured");
      }
    }
    await expect(
      page.getByRole("alert").filter({
        hasText: /not wired|not configured|no checkout was created/i,
      }),
    ).toBeVisible();
  });
});
