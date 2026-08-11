import type { PaymentStatus, Prisma, Winner } from "@prisma/client";

import { prisma } from "../config/prisma";

// Accepts either the shared client or an interactive-transaction client —
// the redraw flow (services/drawService.ts's redrawWinner()) re-reads a
// winner row inside a $transaction (under drawRepository's own draw-level
// lock — see the comment on drawRepository.lockForUpdate() for why the
// lock is scoped there, not here).
type Db = typeof prisma | Prisma.TransactionClient;

export interface WinnerAdminRow extends Winner {
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

export interface WinnerListFilters {
  deviceId?: number;
  employeeId?: number;
  paymentStatus?: PaymentStatus;
}

export interface UpdatePaymentData {
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  paymentDate: Date | null;
}

export const winnerRepository = {
  // Admin-only surface (see routes/adminWinnerRoutes.ts) — every winner
  // record, joined with employee and device context for the admin's
  // "Winner Management" / "Track Payments" view.
  findAllForAdmin(filters: WinnerListFilters): Promise<WinnerAdminRow[]> {
    return prisma.winner.findMany({
      where: {
        deviceId: filters.deviceId,
        employeeId: filters.employeeId,
        paymentStatus: filters.paymentStatus,
      },
      orderBy: { drawDate: "desc" },
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

  findById(id: number, db: Db = prisma): Promise<Winner | null> {
    return db.winner.findUnique({ where: { id } });
  },

  // A winner slot can only be redrawn once — this is how
  // drawService.redrawWinner() checks whether a given winner has already
  // been replaced, both for the fast pre-check and the locked re-check.
  findByRedrawOf(winnerId: number, db: Db = prisma): Promise<Winner | null> {
    return db.winner.findFirst({ where: { redrawOf: winnerId } });
  },

  updatePayment(id: number, data: UpdatePaymentData, db: Db = prisma): Promise<Winner> {
    return db.winner.update({ where: { id }, data });
  },

  updateHandover(id: number, handoverDate: Date, db: Db = prisma): Promise<Winner> {
    return db.winner.update({ where: { id }, data: { handoverDate } });
  },
};
