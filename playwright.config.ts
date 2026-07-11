import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: { baseURL: "http://127.0.0.1:3020", trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ],
  webServer: { command: "npm run dev", url: "http://127.0.0.1:3020", reuseExistingServer: !process.env.CI, timeout: 120_000 }
});
