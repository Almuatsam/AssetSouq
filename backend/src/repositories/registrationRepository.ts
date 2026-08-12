import type { Prisma, Registration, RegistrationStatus } from "@prisma/client";

import { prisma } from "../config/prisma";

// "Active" = still counts against the one-registration-per-employee rule
// (PRD business rules 2 & 5) — not withdrawn and not already rejected.
const ACTIVE_STATUSES = ["PENDING", "ELIGIBLE"] as const;

// Accepts either the shared client or an interactive-transaction client,
// so callers that need the check-then-create in registerInterest() to be
// atomic (see registrationService.ts) can pass a `tx` through.
type Db = typeof prisma | Prisma.TransactionClient;

export interface RegistrationWithDevice extends Registration {
  device: {
    id: number;
    assetTag: string;
    deviceType: string;
    brand: string;
    model: string;
    price: unknown;
    status: string;
  };
}

export interface RegistrationAdminRow extends Registration {
  employee: {
    id: number;
    staffNumber: string;
    name: string;
    department: string;
  };
  device: {
    id: number;
    assetTag: string;
    deviceType: string;
    brand: string;
    model: string;
    price: unknown;
    status: string;
  };
}

export interface RegistrationListFilters {
  status?: RegistrationStatus;
  deviceId?: number;
  employeeId?: number;
  search?: string;
}

export const registrationRepository = {
  findActiveByEmployeeId(employeeId: number, db: Db = prisma): Promise<Registration | null> {
    return db.registration.findFirst({
      where: { employeeId, status: { in: [...ACTIVE_STATUSES] } },
    });
  },

  create(
    data: { employeeId: number; deviceId: number; agreed: boolean },
    db: Db = prisma,
  ): Promise<Registration> {
    return db.registration.create({
      data: { ...data, status: "ELIGIBLE" },
    });
  },

  // Locks the employee's row for the rest of the transaction, so a
  // concurrent registerInterest() call for the same employee blocks here
  // instead of racing past findActiveByEmployeeId() above — closes the
  // window where two simultaneous requests could both see "no active
  // registration" and both create one. Must run inside a transaction
  // (needs a real client, not the pooled shared one) and only helps
  // because every caller of registerInterest() takes this lock first.
  async lockEmployeeForUpdate(employeeId: number, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM Employee WHERE id = ${employeeId} FOR UPDATE`;
  },

  findLatestByEmployeeId(employeeId: number): Promise<RegistrationWithDevice | null> {
    return prisma.registration.findFirst({
      where: { employeeId },
      orderBy: { submittedAt: "desc" },
      include: {
        device: {
          select: {
            id: true,
            assetTag: true,
            deviceType: true,
            brand: true,
            model: true,
            price: true,
            status: true,
          },
        },
      },
    });
  },

  // Admin-only surface (see routes/adminRegistrationRoutes.ts) — every
  // registration regardless of status, with employee and device context
  // an admin needs to make sense of the list.
  findById(id: number): Promise<Registration | null> {
    return prisma.registration.findUnique({ where: { id } });
  },

  // Draw engine (Phase 4, see services/drawService.ts) — the candidate
  // pool for a draw: every ELIGIBLE registration for the device. PENDING/
  // INELIGIBLE/WITHDRAWN are excluded — only ELIGIBLE registrations ever
  // reach a draw (see registerInterest(), which writes ELIGIBLE directly).
  findEligibleByDeviceId(deviceId: number): Promise<Registration[]> {
    return prisma.registration.findMany({ where: { deviceId, status: "ELIGIBLE" } });
  },

  findAllForAdmin(filters: RegistrationListFilters): Promise<RegistrationAdminRow[]> {
    return prisma.registration.findMany({
      where: {
        status: filters.status,
        deviceId: filters.deviceId,
        employeeId: filters.employeeId,
        // Prisma ignores an `undefined` OR entirely, so this only narrows
        // the query when a search term was actually given.
        ...(filters.search
          ? {
              OR: [
                { employee: { name: { contains: filters.search } } },
                { employee: { staffNumber: { contains: filters.search } } },
                { device: { assetTag: { contains: filters.search } } },
              ],
            }
          : {}),
      },
      orderBy: { submittedAt: "desc" },
      include: {
        employee: { select: { id: true, staffNumber: true, name: true, department: true } },
        device: {
          select: {
            id: true,
            assetTag: true,
            deviceType: true,
            brand: true,
            model: true,
            price: true,
            status: true,
          },
        },
      },
    });
  },

  // Optional `db` so drawService.redrawWinner() can close out the
  // original winner's registration atomically inside its own
  // transaction (see that function for why) — every other caller keeps
  // using the default pooled client.
  updateStatus(id: number, status: RegistrationStatus, db: Db = prisma): Promise<Registration> {
    return db.registration.update({ where: { id }, data: { status } });
  },

  // Admin dashboard stats (see services/dashboardService.ts). Every
  // RegistrationStatus key is always present, defaulted to 0 — see the
  // matching comment on deviceRepository.countByStatus().
  async countByStatus(): Promise<Record<RegistrationStatus, number>> {
    const rows = await prisma.registration.groupBy({ by: ["status"], _count: { _all: true } });
    const counts: Record<RegistrationStatus, number> = {
      PENDING: 0,
      ELIGIBLE: 0,
      INELIGIBLE: 0,
      WITHDRAWN: 0,
    };
    for (const row of rows) {
      counts[row.status] = row._count._all;
    }
    return counts;
  },
};
