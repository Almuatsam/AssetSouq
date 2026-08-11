import type { NextFunction, Request, Response } from "express";

import { drawService } from "../services/drawService";
import { requireAdminId } from "../utils/requestUtils";
import { runDrawSchema } from "../validators/adminDrawValidators";

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
