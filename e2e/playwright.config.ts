import path from "node:path";

import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

import { requireEnv } from "./env";

dotenv.config({ path: path.resolve(__dirname, ".env.e2e.local") });

const backendPort = process.env.BACKEND_PORT ?? "4001";
const frontendPort = process.env.FRONTEND_PORT ?? "5174";
const backendUrl = `http://localhost:${backendPort}`;
const frontendUrl = `http://localhost:${frontendPort}`;

const databaseUrl = requireEnv("DATABASE_URL");
const jwtSecret = requireEnv("JWT_SECRET");

export { backendUrl, frontendUrl, databaseUrl };

export default defineConfig({
  testDir: "./tests",
  // The golden-path spec builds up shared state (an employee + device
  // created by one admin session, then logged into as that employee) —
  // parallel workers would race each other's assumptions about what
  // exists. A dedicated, single-worker E2E database keeps this simple
  // rather than parameterizing every spec with worker-unique data.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: require.resolve("./global-setup.ts"),
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev",
      cwd: path.resolve(__dirname, "../backend"),
      url: `${backendUrl}/api/health`,
      env: {
        PORT: backendPort,
        DATABASE_URL: databaseUrl,
        JWT_SECRET: jwtSecret,
        JWT_EXPIRES_IN: "8h",
        CORS_ORIGIN: frontendUrl,
        TRUST_PROXY: "false",
        NODE_ENV: "development",
      },
      // Locally (not CI), the backend process — and with it, the login
      // rate limiters' in-memory counters (middlewares/rateLimit.ts) —
      // survives across repeated `npm run test:e2e` invocations. Each run
      // does a handful of login attempts; re-running the suite many times
      // within the same 15-minute window can trip "Too many login
      // attempts" — a rate-limit artifact, not a real failure. Restart
      // the e2e backend process (or wait out the window) if that happens.
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `npm run dev -- --port ${frontendPort} --strictPort`,
      cwd: path.resolve(__dirname, "../frontend"),
      url: frontendUrl,
      env: {
        VITE_API_BASE_URL: `${backendUrl}/api`,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
