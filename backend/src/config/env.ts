import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const JWT_EXPIRES_IN_PATTERN = /^\d+\s*(ms|s|m|h|d|w|y)?$/i;

function parseJwtExpiresIn(): string {
  const value = process.env.JWT_EXPIRES_IN ?? "8h";
  if (!JWT_EXPIRES_IN_PATTERN.test(value.trim())) {
    throw new Error(
      `Invalid JWT_EXPIRES_IN: "${value}". Expected a number with an optional unit ` +
        `(ms|s|m|h|d|w|y), e.g. "8h".`,
    );
  }
  return value;
}

// Express's "trust proxy" setting (see https://expressjs.com/en/guide/behind-proxies.html).
// Defaults to not trusting any proxy — safe for local dev, but MUST be set
// correctly in any deployment behind a reverse proxy/load balancer, or
// express-rate-limit's per-IP login limiter (middlewares/rateLimit.ts)
// either collapses every user behind that proxy into one shared bucket or
// becomes bypassable via spoofed X-Forwarded-For. Accepts a boolean
// ("true"/"false"), a hop count ("1"), or a comma-separated IP/CIDR list —
// anything Express's `trust proxy` setting itself accepts.
function parseTrustProxy(): boolean | number | string {
  const value = process.env.TRUST_PROXY?.trim();
  if (!value || value === "false") return false;
  if (value === "true") return true;
  return /^\d+$/.test(value) ? Number(value) : value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  trustProxy: parseTrustProxy(),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: parseJwtExpiresIn(),
};
