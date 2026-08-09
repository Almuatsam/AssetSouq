import type { Prisma, Registration } from "@prisma/client";

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
};
