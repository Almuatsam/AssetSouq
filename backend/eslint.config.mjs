import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "generated"] },
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      // Underscore-prefixed = intentionally unused, not dead code — e.g.
      // Express error-handler middleware's required 4-arg signature
      // (errorHandler.ts's `_next`/`_req`) and destructuring a field out
      // on purpose (authService.ts's `{ passwordHash: _passwordHash,
      // ...safeAdmin }`).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      // Jest's jest.resetModules() + require() is the standard way to
      // get a fresh module instance per test (see env.test.ts) — needed
      // specifically to test config/env.ts's load-time parsing/throw
      // behavior against different process.env values, which a
      // top-level `import` (evaluated once, cached) can't re-trigger.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
