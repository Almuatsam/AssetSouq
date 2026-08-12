// Jest `setupFiles` entry — runs before any test module is evaluated, which
// matters because `src/config/env.ts` calls `required()` at import time
// (module load, not test run time). Any suite that transitively imports
// `src/app.ts` or `src/utils/jwt.ts` therefore needs DATABASE_URL and
// JWT_SECRET to already be set before that import happens — a plain
// `beforeAll` in a test file runs too late.
//
// `??=` only fills in a value when one isn't already set, so real values
// provided by the environment (a developer's `.env`, or CI-injected
// secrets) always take precedence over these test placeholders.
//
// No test in this suite talks to a real database — every test that
// touches Prisma mocks `src/config/prisma` (see tests/repositories.test.ts
// and the service-layer tests), so this DATABASE_URL only needs to be a
// syntactically valid placeholder, never a reachable one.
process.env.DATABASE_URL ??= "mysql://test:test@localhost:3306/assetsouq_test";
process.env.JWT_SECRET ??= "test-jwt-secret-not-for-production-use";
