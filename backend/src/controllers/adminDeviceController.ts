import type { NextFunction, Request, Response } from "express";

import { deviceService } from "../services/deviceService";
import { idParamSchema } from "../validators/commonValidators";
import {
  createDeviceSchema,
  listDevicesQuerySchema,
  updateDeviceSchema,
} from "../validators/adminDeviceValidators";

export const adminDeviceController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = listDevicesQuerySchema.parse(req.query);
      const devices = await deviceService.listAll(status);
      res.json({ success: true, data: { devices } });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createDeviceSchema.parse(req.body);
      const device = await deviceService.createDevice(input);
      res.status(201).json({ success: true, data: { device } });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const input = updateDeviceSchema.parse(req.body);
      const device = await deviceService.updateDevice(id, input);
      res.json({ success: true, data: { device } });
    } catch (err) {
      next(err);
    }
  },
};
