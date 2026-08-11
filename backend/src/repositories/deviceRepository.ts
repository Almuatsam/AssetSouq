import type { Device, DeviceStatus, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

export type CreateDeviceData = Omit<Prisma.DeviceCreateInput, "status" | "createdAt">;
export type UpdateDeviceData = Partial<Omit<Prisma.DeviceUpdateInput, "assetTag" | "createdAt">>;

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

  findByAssetTag(assetTag: string): Promise<Device | null> {
    return prisma.device.findUnique({ where: { assetTag } });
  },

  // Admin-only surface (see routes/adminDeviceRoutes.ts) — every device
  // regardless of status, not just AVAILABLE ones.
  findAll(status?: DeviceStatus): Promise<Device[]> {
    return prisma.device.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  },

  create(data: CreateDeviceData): Promise<Device> {
    return prisma.device.create({ data });
  },

  update(id: number, data: UpdateDeviceData): Promise<Device> {
    return prisma.device.update({ where: { id }, data });
  },

  // Admin dashboard stats (see services/dashboardService.ts). Every
  // DeviceStatus key is always present, defaulted to 0 — groupBy only
  // returns rows for statuses that actually have at least one device, and
  // a status with zero devices should still show as 0, not be missing.
  async countByStatus(): Promise<Record<DeviceStatus, number>> {
    const rows = await prisma.device.groupBy({ by: ["status"], _count: { _all: true } });
    const counts: Record<DeviceStatus, number> = { AVAILABLE: 0, REMOVED: 0, DRAWN: 0, SOLD: 0 };
    for (const row of rows) {
      counts[row.status] = row._count._all;
    }
    return counts;
  },
};
