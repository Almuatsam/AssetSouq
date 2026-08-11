import type { Draw, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

// Accepts either the shared client or an interactive-transaction client —
// a draw's Draw row, its Winner rows, the device status flip, and each
// winner's lastWinnerDate must all commit atomically (see
// services/drawService.ts's $transaction), so every write here needs to
// be able to run inside that transaction.
type Db = typeof prisma | Prisma.TransactionClient;

export interface CreateDrawData {
  deviceId: number;
  rngSeed: string;
  candidatePoolSnapshot: number[];
  drawnByAdminId: number;
}

export interface CreateWinnerData {
  employeeId: number;
  deviceId: number;
  drawId: number;
  priceDue: Prisma.Decimal;
}

export interface DrawWithWinners extends Draw {
  winners: {
    id: number;
    employeeId: number;
    deviceId: number;
    drawId: number | null;
    priceDue: unknown;
    paymentStatus: string;
    employee: { id: number; staffNumber: string; name: string; department: string };
  }[];
}

export const drawRepository = {
  create(data: CreateDrawData, db: Db = prisma): Promise<Draw> {
    return db.draw.create({ data });
  },

  createWinner(data: CreateWinnerData, db: Db = prisma) {
    return db.winner.create({ data });
  },

  findByIdWithWinners(id: number, db: Db = prisma): Promise<DrawWithWinners | null> {
    // `select` (not `include`) on `winners`, scoped to exactly the fields
    // DrawWithWinners declares — `include` would also pull every other
    // Winner column (paymentDate, paymentMethod, handoverDate, redrawOf,
    // redrawReason, ...), which the hand-written type doesn't advertise
    // but would still genuinely be present (and serialized into the API
    // response) at runtime. Matches the same select-scoped convention
    // already used for the employee/device joins elsewhere (see
    // registrationRepository.ts's RegistrationAdminRow, winnerRepository.ts).
    return db.draw.findUnique({
      where: { id },
      include: {
        winners: {
          select: {
            id: true,
            employeeId: true,
            deviceId: true,
            drawId: true,
            priceDue: true,
            paymentStatus: true,
            employee: { select: { id: true, staffNumber: true, name: true, department: true } },
          },
        },
      },
    });
  },
};
