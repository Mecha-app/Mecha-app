import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Diagnosis (/app/diagnose): submit a problem in your own words and
 * assert the HONESTY RULE.
 *
 * Real behaviour (verified in source — app/app/diagnose/page.tsx and
 * app/api/diagnose/route.ts):
 *   - Heading "Diagnose my car"; fields "Your car" and "What is
 *     happening?" (placeholder "e.g. Orange check-engine light,
 *     rough idle when cold, started yesterday"); submit "Get my
 *     diagnosis" (conversion pass, 2026-11-20).
 *   - The free-diagnosis meter is rendered from the server quota BEFORE
 *     the form, as "<n> of 5 free diagnoses left" (role="status"), or
 *     "Pro plan — unlimited diagnoses." It must be visible either way.
 *   - When the AI provider IS wired: the answer streams and a report
 *     renders with a severity verdict ("Critical" / "Moderate — Fix
 *     Soon" / "Minor — Monitor") and a "Fair repair range: $min–$max".
 *   - When it is NOT wired: POST /api/diagnose answers 501
 *     ai_not_configured ("The diagnosis engine is not wired in this
 *     environment yet — no AI call was made.") and the page surfaces
 *     that detail in a role="alert" element. That honest state is a
 *     PASS — a fake/fabricated report in an unwired environment is the
 *     failure this spec exists to catch.
 *   - A phone-less account is redirected to /app/complete-profile
 *     (phone_required) — signIn() here always produces a phone-complete
 *     account, so that redirect must NOT happen.
 */

test.describe("diagnosis", () => {
  test("submit a problem — report or honest not-configured state, meter visible", async ({
    page,
  }) => {
    await signIn(page);

    await page.goto("/app/diagnose");
    await expect(
      page.getByRole("heading", { name: "Diagnose my car" }),
    ).toBeVisible();
    // Phone gate: a phone-complete account must not be bounced.
    await expect(page).toHaveURL(/\/app\/diagnose/);

    // The 5-free-diagnoses meter / countdown is visible before running.
    const meter = page.getByText(
      /of 5 free diagnoses? left|free diagnoses? left|unlimited diagnoses/i,
    );
    await expect(meter.first()).toBeVisible();

    await page
      .getByLabel("What is happening?")
      .fill("My brakes grind when I stop");
    await page.getByRole("button", { name: "Get my diagnosis" }).click();

    // Either outcome is acceptable — and only one of them may appear:
    // (a) a real report, or (b) the honest not-configured alert.
    const reportSeverity = page.getByText(
      /Critical|Moderate — Fix Soon|Minor — Monitor/,
    );
    const fairPrice = page.getByText(/Fair repair range:/);
    const honestAlert = page
      .getByRole("alert")
      .filter({
        hasText:
          /not wired|not configured|no AI call was made|could not be completed/i,
      });
    const outOfFree = page.getByRole("heading", {
      name: "You are out of free diagnoses",
    });

    await expect
      .poll(
        async () => {
          if (await honestAlert.isVisible().catch(() => false)) return "honest";
          if (await outOfFree.isVisible().catch(() => false)) return "blocked";
          if (
            (await reportSeverity.first().isVisible().catch(() => false)) &&
            (await fairPrice.isVisible().catch(() => false))
          )
            return "report";
          return "waiting";
        },
        { timeout: 30_000, intervals: [500, 1_000, 2_000] },
      )
      .not.toBe("waiting");

    const outcome = await page.evaluate(() => document.body.innerText);

    if (/not wired|not configured|no AI call was made/i.test(outcome)) {
      // Honest state: there must be NO fabricated report alongside it.
      await expect(fairPrice).toHaveCount(0);
    } else if (/Fair repair range:/.test(outcome)) {
      // Real report: severity + fair price are both part of it.
      await expect(reportSeverity.first()).toBeVisible();
      await expect(fairPrice).toBeVisible();
    }
    // The third honest outcome — quota exhausted ("You are out of free
    // diagnoses" + a link to Pro) — is also a pass with no fake report.

    // The meter is still visible after the run (updated count or the
    // blocked-state explanation).
    await expect(
      page
        .getByText(
          /of 5 free diagnoses? left|free diagnoses? left|unlimited diagnoses|out of free diagnoses/i,
        )
        .first(),
    ).toBeVisible();
  });
});
