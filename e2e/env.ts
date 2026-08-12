// Shared by playwright.config.ts, global-setup.ts, and the specs
// themselves — previously each of those had its own copy-pasted
// `required()`/`!` handling, so a spec reading a missing env var failed
// with a confusing `.fill(undefined)` deep in a test instead of a clear
// startup error.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required E2E env var: ${name}. Copy e2e/.env.e2e.example to ` +
        `e2e/.env.e2e.local and fill in real values (see README.md).`,
    );
  }
  return value;
}
