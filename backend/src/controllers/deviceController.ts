import type { NextFunction, Request, Response } from "express";

import { deviceService } from "../services/deviceService";
import { idParamSchema } from "../validators/commonValidators";

export const deviceController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const devices = await deviceService.listAvailable();
      res.json({ success: true, data: { devices } });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const device = await deviceService.getById(id);
      res.json({ success: true, data: { device } });
    } catch (err) {
      next(err);
    }
  },
};
