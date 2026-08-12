import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env";
import type { AuthUser } from "../types/express";

// No server-side revocation exists for tokens issued here — there is no
// blocklist, no refresh-token rotation, and no `/auth/logout` endpoint;
// "logging out" (frontend/src/store/AuthContext.tsx) only clears the
// token client-side. A copied/exfiltrated token, or one left behind on a
// shared machine, stays fully valid until it naturally expires
// (JWT_EXPIRES_IN, 8h by default). This matters more than it would for a
// typical session because employee login has no password at all (see
// authService.ts's loginEmployee — staff-ID-only, already an accepted
// MVP tradeoff) — the token is the *sole* proof of identity for that
// role. Accepted for this phase alongside the other auth tradeoffs
// already documented in authStorage.ts and authService.ts; if this needs
// closing later, the standard fixes are a short-TTL access token + a
// refresh token, or a minimal revocation list keyed by a token `jti`.
export type TokenPayload = AuthUser;

// Pin the algorithm on both sign and verify. Defense-in-depth against
// algorithm-confusion attacks — not exploitable today with a single
// symmetric secret, but cheap to close off explicitly rather than rely on
// jsonwebtoken's own defaults.
const JWT_ALGORITHM = "HS256" as const;

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): TokenPayload {
  // Throws JsonWebTokenError/TokenExpiredError on invalid/expired tokens —
  // callers (auth middleware) are responsible for catching and mapping to
  // a 401 response.
  return jwt.verify(token, env.jwtSecret, { algorithms: [JWT_ALGORITHM] }) as TokenPayload;
}
