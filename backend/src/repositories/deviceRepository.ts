import type { Device, DeviceStatus, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

export type CreateDeviceData = Omit<Prisma.DeviceCreateInput, "status" | "createdAt">;
export type UpdateDeviceData = Partial<Omit<Prisma.DeviceUpdateInput, "assetTag" | "createdAt">>;

// Accepts either the shared client or an interactive-transaction client —
// see registrationRepository.ts's identical Db type for the rationale
// (the draw engine's markDrawn() must commit atomically with the Winner
// rows it creates, see services/drawService.ts).
type Db = typeof prisma | Prisma.TransactionClient;

export const deviceRepository = {
  findAvailable(): Promise<Device[]> {
    return prisma.device.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number, db: Db = prisma): Promise<Device | null> {
    return db.device.findUnique({ where: { id } });
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

  // Draw engine (Phase 4, see services/drawService.ts) — deliberately
  // separate from update() rather than routed through the generic
  // ALLOWED_STATUS_TRANSITIONS-guarded admin edit path: AVAILABLE -> DRAWN
  // only ever happens as a side effect of a draw actually running, never
  // as a direct admin status edit.
  markDrawn(deviceId: number, db: Db = prisma): Promise<Device> {
    return db.device.update({ where: { id: deviceId }, data: { status: "DRAWN" } });
  },

  // Locks the device row for the rest of the transaction — closes the
  // TOCTOU window where two concurrent runDraw() calls for the same
  // device both pass the pre-check in drawService.ts (which reads
  // outside any transaction) before either write lands, and both go on
  // to create their own Draw + Winner rows for a device that can only
  // legitimately be drawn once. Must run inside a transaction (needs a
  // real client, not the pooled shared one). Mirrors
  // registrationRepository.lockEmployeeForUpdate()'s identical pattern.
  async lockForUpdate(deviceId: number, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM Device WHERE id = ${deviceId} FOR UPDATE`;
  },
};
