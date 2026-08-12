/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  // Must run before module evaluation (not setupFilesAfterEnv, which runs
  // after the test framework is set up but still after modules under test
  // have already been required) — see tests/setupEnv.ts for why.
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
