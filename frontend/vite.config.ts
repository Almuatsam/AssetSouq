import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  // Note: the test scripts in package.json run with
  // NODE_OPTIONS=--no-experimental-webstorage. Node 22+'s own native
  // localStorage/sessionStorage global otherwise shadows jsdom's
  // implementation here, leaving `localStorage` present but missing its
  // methods (e.g. "localStorage.getItem is not a function").
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    // Vitest's default "threads" pool shares a single esbuild transform
    // service across every worker thread — if that service crashes (seen
    // on this machine under load: "The service is no longer running"),
    // it takes every in-flight test file down at once. "forks" isolates
    // each file in its own process instead, and capping concurrency keeps
    // peak resource usage down on a constrained machine.
    pool: "forks",
    poolOptions: {
      forks: {
        // Both bounds set explicitly and equal — leaving minForks at its
        // default while only capping maxForks let the default resolve
        // higher than 2 on this machine, which Tinypool rejects outright
        // ("minThreads and maxThreads must not conflict").
        minForks: 1,
        maxForks: 2,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Setting `exclude` overrides Vitest's own defaults (which include
      // **/*.config.* among others) rather than extending them, so those
      // patterns are repeated explicitly here.
      exclude: [
        "**/*.config.*",
        "**/*.d.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/test/**",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
