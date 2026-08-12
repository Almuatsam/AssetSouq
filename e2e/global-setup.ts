import { execSync } from "node:child_process";
import path from "node:path";

import dotenv from "dotenv";

import { requireEnv } from "./env";

// Resets the dedicated E2E database (migrations + the bootstrap admin
// seed — see backend/package.json's "prisma.seed") to a clean slate
// before any test runs (this global setup completes, synchronously,
// before Playwright hands control to the test runner — the webServer
// processes may already be booting in parallel, but nothing here depends
// on them being up), so specs never depend on state left over from a
// previous run and never touch assetsouq_dev (local dev data lives
// there, untouched by this — see docker-compose.yml / README.md).
export default function globalSetup(): void {
  dotenv.config({ path: path.resolve(__dirname, ".env.e2e.local") });

  const databaseUrl = requireEnv("DATABASE_URL");
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    SEED_ADMIN_USERNAME: requireEnv("SEED_ADMIN_USERNAME"),
    SEED_ADMIN_PASSWORD: requireEnv("SEED_ADMIN_PASSWORD"),
  };

  // `migrate reset --force` is irreversible — it drops and recreates
  // whatever database DATABASE_URL points at. backend/.env's DATABASE_URL
  // points at assetsouq_dev on this exact same host/port, so a
  // copy-paste slip while filling in .env.e2e.local (a real, easy
  // mistake — see the README's setup steps) would otherwise wipe real
  // local dev data with no warning. Refuse to proceed unless the target
  // database name unambiguously looks like an E2E one.
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!/e2e/i.test(databaseName)) {
    throw new Error(
      `Refusing to reset database "${databaseName}" — DATABASE_URL in .env.e2e.local must ` +
        `point at a database with "e2e" in its name (e.g. assetsouq_e2e), not a dev/prod one.`,
    );
  }

  const backendDir = path.resolve(__dirname, "../backend");

  // `migrate reset --force` drops and recreates the database from the
  // migration history, then automatically runs the seed command
  // configured in backend/package.json's "prisma.seed" — one command
  // covers both "clean schema" and "bootstrap admin present". A single
  // static command string via execSync (all arguments are fixed literals,
  // nothing interpolated) rather than execFileSync's args array + shell
  // combination, which Node flags as unsafe on Windows (args aren't
  // escaped when shell is involved).
  execSync("npx prisma migrate reset --force --skip-generate", {
    cwd: backendDir,
    env,
    stdio: "inherit",
  });
}
