import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for happy-path smoke tests against the running app.
 *
 * Before the first run, install browsers locally:
 *   npx playwright install chromium
 *
 * Then:
 *   npm run e2e          # run all tests headless
 *   npm run e2e:ui       # open Playwright's UI mode
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Start the Next dev server before running tests, reuse if one is up.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
