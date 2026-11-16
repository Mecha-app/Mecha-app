import { defineConfig, devices } from "@playwright/test";

/**
 * MECHA e2e configuration.
 *
 * - When E2E_BASE_URL is set, the suite runs against that already-running
 *   deployment (staging / preview / production smoke) and Playwright does
 *   NOT start a server of its own.
 * - When E2E_BASE_URL is not set, Playwright starts the production build
 *   locally with `npm run start` (run `npm run build` first) and reuses an
 *   already-running server on port 3000 when there is one.
 */
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Start the app only for local runs — never when a base URL was given.
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          command: "npm run start",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
