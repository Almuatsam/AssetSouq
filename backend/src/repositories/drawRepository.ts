import type { Draw, Prisma, RedrawReason, Winner } from "@prisma/client";

import { prisma } from "../config/prisma";

// Accepts either the shared client or an interactive-transaction client —
// a draw's Draw row, its Winner rows, and the device status flip must all
// commit atomically (see services/drawService.ts's $transaction), so
// every write here needs to be able to run inside that transaction.
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
  // Only set when this winner row is a redraw replacement (see
  // drawService.redrawWinner()) — omitted for an original draw's winners.
  redrawOf?: number;
  redrawReason?: RedrawReason;
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

  createWinner(data: CreateWinnerData, db: Db = prisma): Promise<Winner> {
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

  // Locks the draw row for the rest of the transaction. Used by
  // redrawWinner() — not winnerRepository.lockForUpdate() on the specific
  // winner being redrawn, because the resource actually contested by two
  // *different* redraws on the *same* draw is "who's the next eligible
  // waiting-list candidate", which is scoped to the draw, not to either
  // individual winner slot. Locking only the winner row left that shared
  // resource unprotected: two concurrent redraws of two different winner
  // slots on one draw could both compute the same next-in-line candidate
  // before either committed. Locking the draw serializes every redraw
  // against it, closing that gap the same way deviceRepository's device
  // lock closes runDraw()'s device-level race.
  async lockForUpdate(id: number, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM Draw WHERE id = ${id} FOR UPDATE`;
  },
};
