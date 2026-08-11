import type { PaymentStatus, Winner } from "@prisma/client";

import { prisma } from "../config/prisma";

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
};
