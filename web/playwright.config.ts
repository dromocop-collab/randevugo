import { defineConfig, devices } from "@playwright/test";

// PLAYWRIGHT_BASE_URL lets the suite run against an already running server
// (e.g. `next start` of a production build) instead of booting `next dev`.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/+$/, "");
const baseURL = externalBaseURL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: externalBaseURL ? undefined : {
    // CI'da derlenmiş sürüm test edilir: geliştirme sunucusunun ilk derlemesi 130+ testte zaman aşımına düşüyordu.
    command: process.env.CI
      ? "npm run build && npm run start -- --hostname 127.0.0.1 --port 3000"
      : "npm run dev -- --hostname 127.0.0.1",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 600_000 : 120_000,
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: "e2e-test-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-randevugo-e2e.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-randevugo-e2e",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-randevugo-e2e.appspot.com",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:e2e",
      NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY: "",
    },
  },
});
