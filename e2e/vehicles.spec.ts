import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Health Vault vehicles (/app/vault): add -> listed -> edit mileage ->
 * delete.
 *
 * Real form behaviour (verified in source — app/app/vault/page.tsx and
 * lib/server/vehicleService.ts):
 *   - The add form REQUIRES five fields: Year, Make, Model, Engine and
 *     Mileage ("Year, make, model, engine, and mileage are required").
 *     Filling only year/make/model cannot submit, so this spec fills
 *     engine and mileage too.
 *   - Labels are Year / Make / Model / Engine / Mileage; the VIN field
 *     placeholder is "Enter VIN number"; submit is "Add vehicle".
 *   - A saved vehicle appears in the list as "2019 Honda Accord" with
 *     its mileage rendered like "82,500 mi" (toLocaleString).
 *   - Delete: open the vehicle, click "Remove vehicle", and confirm the
 *     browser confirm() dialog ("Remove this vehicle and its saved
 *     history link?").
 *
 * ⚠️ EDIT GAP (flagged for the coordinator): the vault UI has NO edit
 * form — there is no Edit control on the page. Editing exists only as
 * the API: PATCH /api/vehicles/[id] (vehicleService.updateVehicle).
 * The mileage edit below therefore goes through that real API with the
 * signed-in session token, then reloads and asserts the UI shows the
 * new mileage. If/when an edit form ships, replace the API step with
 * the form and delete this note.
 */

test.describe("vehicles (Health Vault)", () => {
  test("add, list, edit mileage, and delete a vehicle", async ({ page }) => {
    await signIn(page);

    await page.goto("/app/vault");
    await expect(
      page.getByRole("heading", { name: "Health Vault" }),
    ).toBeVisible();

    // --- Add ------------------------------------------------------------
    // VIN field is part of the real form (placeholder verified in brief
    // and source) — assert it is there, but a VIN is optional, so the
    // test vehicle is added without one (no external VIN decode needed).
    await expect(
      page.getByPlaceholder("Enter VIN number"),
    ).toBeVisible();

    await page.getByLabel("Year", { exact: true }).fill("2019");
    await page.getByLabel("Make", { exact: true }).fill("Honda");
    await page.getByLabel("Model", { exact: true }).fill("Accord");
    await page.getByLabel("Engine", { exact: true }).fill("2.0L 4-cylinder");
    await page.getByLabel("Mileage", { exact: true }).fill("80000");
    await page.getByRole("button", { name: "Add vehicle" }).click();

    // --- Listed -----------------------------------------------------------
    const vehicleEntry = page.getByRole("button", {
      name: /2019 Honda Accord/,
    });
    await expect(vehicleEntry).toBeVisible();
    await expect(vehicleEntry).toContainText("80,000 mi");

    // --- Edit mileage (API — no edit form in the UI, see header note) -----
    const vehicleId = await page.evaluate(async () => {
      const token = localStorage.getItem("mechaToken");
      const res = await fetch("/api/vehicles", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as {
        vehicles?: Array<{ id: string; year: string; make: string; model: string }>;
      };
      const match = (data.vehicles ?? []).find(
        (v) => v.year === "2019" && v.make === "Honda" && v.model === "Accord",
      );
      if (!match) throw new Error("added vehicle not returned by GET /api/vehicles");
      const patch = await fetch(`/api/vehicles/${match.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mileage: 82500 }),
      });
      if (!patch.ok) throw new Error(`PATCH mileage failed: ${patch.status}`);
      return match.id;
    });
    expect(vehicleId).toBeTruthy();

    await page.reload();
    await expect(vehicleEntry).toBeVisible();
    await expect(vehicleEntry).toContainText("82,500 mi");

    // --- Delete -----------------------------------------------------------
    page.once("dialog", (dialog) => void dialog.accept());
    await vehicleEntry.click();
    await page.getByRole("button", { name: "Remove vehicle" }).click();

    await expect(vehicleEntry).toHaveCount(0);
  });
});
