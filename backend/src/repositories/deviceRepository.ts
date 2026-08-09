import type { Device } from "@prisma/client";

import { prisma } from "../config/prisma";

export const deviceRepository = {
  findAvailable(): Promise<Device[]> {
    return prisma.device.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number): Promise<Device | null> {
    return prisma.device.findUnique({ where: { id } });
  },
};
