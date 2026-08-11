import type { Request } from "express";

import { AppError } from "../middlewares/errorHandler";

// requireRole("ADMIN") always runs before any controller that calls this
// (see routes/adminDrawRoutes.ts, routes/adminWinnerRoutes.ts), so
// req.user is present in practice — this just keeps that assumption
// type-safe rather than asserting it. Extracted here once it was being
// duplicated verbatim between adminDrawController.ts and
// adminWinnerController.ts. Mirrors registrationController.ts's
// requireEmployeeId for the employee side.
export function requireAdminId(req: Request): number {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }
  return req.user.id;
}
