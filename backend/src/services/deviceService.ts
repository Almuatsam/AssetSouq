import type { Device } from "@prisma/client";

import { deviceRepository } from "../repositories/deviceRepository";
import { AppError } from "../middlewares/errorHandler";

export const deviceService = {
  listAvailable(): Promise<Device[]> {
    return deviceRepository.findAvailable();
  },

  async getById(id: number): Promise<Device> {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new AppError(404, "Device not found");
    }
    return device;
  },
};
