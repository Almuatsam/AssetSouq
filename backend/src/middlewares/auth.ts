import type { NextFunction, Request, Response } from "express";

import type { AuthRole } from "../types/express";
import { isAdminTokenStillValid } from "../utils/adminSessionInvalidation";
import { verifyToken } from "../utils/jwt";
import { AppError } from "./errorHandler";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

// Verifies the JWT and attaches req.user. Does not check role — pair with
// requireRole() for role-gated routes.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  try {
    const decoded = verifyToken(token);

    // Admin tokens only — see utils/adminSessionInvalidation.ts. A stale
    // admin token (issued before that admin completed the one-time
    // credential handover) is rejected here even though its signature
    // and expiry are still otherwise valid. Employee tokens never go
    // through this check; the invalidation map is never populated for
    // anything but an admin id, so this is a no-op until that flow runs.
    if (decoded.role === "ADMIN" && !isAdminTokenStillValid(decoded.id, decoded.iat)) {
      next(new AppError(401, "Session expired — please log in again"));
      return;
    }

    req.user = decoded;
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: AuthRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "Authentication required"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "Insufficient permissions"));
      return;
    }
    next();
  };
}
