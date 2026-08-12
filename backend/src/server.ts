import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`AssetSouq API listening on port ${env.port} (${env.nodeEnv})`);
});

// Docker sends SIGTERM on `docker stop` / a rolling deploy's container
// swap (SIGINT covers the same case for a local Ctrl+C) — without this,
// in-flight requests get cut off mid-response instead of finishing, and
// Prisma's connection pool is torn down uncleanly instead of closed.
function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    prisma
      .$disconnect()
      .catch((err: unknown) => console.error("Error disconnecting Prisma during shutdown:", err))
      .finally(() => process.exit(0));
  });
  // Docker's default grace period before a follow-up SIGKILL is 10s —
  // force-exit slightly ahead of that if an in-flight request or the
  // disconnect itself hangs, rather than being killed mid-cleanup.
  setTimeout(() => process.exit(1), 9000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
