import type { NextFunction, Request, Response } from "express";

import { AppError } from "../middlewares/errorHandler";
import { drawService } from "../services/drawService";
import { runDrawSchema } from "../validators/adminDrawValidators";

// requireRole("ADMIN") always runs before this on the route (see
// routes/adminDrawRoutes.ts), so req.user is present in practice — this
// just keeps that assumption type-safe rather than asserting it. Mirrors
// registrationController.ts's requireEmployeeId for the employee side.
function requireAdminId(req: Request): number {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }
  return req.user.id;
}

export const adminDrawController = {
  async run(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = requireAdminId(req);
      const { deviceId } = runDrawSchema.parse(req.body);
      const draw = await drawService.runDraw(deviceId, adminId);
      res.status(201).json({ success: true, data: { draw } });
    } catch (err) {
      next(err);
    }
  },
};
