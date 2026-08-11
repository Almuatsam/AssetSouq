import type { Winner } from "@prisma/client";

import { AppError } from "../middlewares/errorHandler";
import type { WinnerAdminRow, WinnerListFilters } from "../repositories/winnerRepository";
import { winnerRepository } from "../repositories/winnerRepository";
import type { RecordPaymentInput } from "../validators/adminWinnerValidators";

export const winnerService = {
  // Admin-only surface (see routes/adminWinnerRoutes.ts).
  listAllForAdmin(filters: WinnerListFilters): Promise<WinnerAdminRow[]> {
    return winnerRepository.findAllForAdmin(filters);
  },

  async recordPayment(id: number, input: RecordPaymentInput): Promise<Winner> {
    const winner = await winnerRepository.findById(id);
    if (!winner) {
      throw new AppError(404, "Winner not found");
    }
    // paymentMethod/paymentDate are only meaningful for PAID — clearing
    // them on NON_PAYMENT keeps the record honest if an admin corrects a
    // mistaken PAID back to NON_PAYMENT rather than leaving stale values.
    const isPaid = input.paymentStatus === "PAID";
    return winnerRepository.updatePayment(id, {
      paymentStatus: input.paymentStatus,
      paymentMethod: isPaid ? (input.paymentMethod ?? null) : null,
      paymentDate: isPaid ? new Date() : null,
    });
  },

  async recordHandover(id: number): Promise<Winner> {
    const winner = await winnerRepository.findById(id);
    if (!winner) {
      throw new AppError(404, "Winner not found");
    }
    // docs/03-App-Flow.md: "Once paid, device moves to handover" — payment
    // is a precondition, not something handover can shortcut.
    if (winner.paymentStatus !== "PAID") {
      throw new AppError(409, "Cannot hand over a device before payment is recorded");
    }
    if (winner.handoverDate) {
      throw new AppError(409, "This device has already been handed over");
    }
    return winnerRepository.updateHandover(id, new Date());
  },
};
