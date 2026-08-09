import type { NextFunction, Request, Response } from "express";

import { AppError } from "../middlewares/errorHandler";
import { registrationService } from "../services/registrationService";
import { createRegistrationSchema } from "../validators/registrationValidators";

// requireRole("EMPLOYEE") always runs before these on the route (see
// routes/registrationRoutes.ts), so req.user is present in practice —
// this just keeps that assumption type-safe rather than asserting it.
function requireEmployeeId(req: Request): number {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }
  return req.user.id;
}

export const registrationController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = requireEmployeeId(req);
      const { deviceId, agreed } = createRegistrationSchema.parse(req.body);
      const registration = await registrationService.registerInterest(employeeId, deviceId, agreed);
      res.status(201).json({ success: true, data: { registration } });
    } catch (err) {
      next(err);
    }
  },

  async mine(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = requireEmployeeId(req);
      const registration = await registrationService.getMyRegistration(employeeId);
      res.json({ success: true, data: { registration } });
    } catch (err) {
      next(err);
    }
  },
};
