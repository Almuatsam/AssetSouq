import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env";
import type { AuthUser } from "../types/express";

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
