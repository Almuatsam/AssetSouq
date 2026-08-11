import type { NextFunction, Request, Response } from "express";

import { registrationService } from "../services/registrationService";
import { idParamSchema } from "../validators/commonValidators";
import {
  listRegistrationsQuerySchema,
  updateRegistrationStatusSchema,
} from "../validators/adminRegistrationValidators";

export const adminRegistrationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = listRegistrationsQuerySchema.parse(req.query);
      const registrations = await registrationService.listAllForAdmin(filters);
      res.json({ success: true, data: { registrations } });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const { status } = updateRegistrationStatusSchema.parse(req.body);
      const registration = await registrationService.updateStatus(id, status);
      res.json({ success: true, data: { registration } });
    } catch (err) {
      next(err);
    }
  },
};
