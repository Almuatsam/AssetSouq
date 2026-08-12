import type { Winner } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import { employeeRepository } from "../repositories/employeeRepository";
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
    // Mirrors drawService.redrawWinner()'s own "already been redrawn"
    // guard — a redrawn-away winner row is dead; the replacement winner
    // is the one who actually holds the slot now. Without this, a stale
    // "Mark Paid" click (or a replayed request) on the *original* row
    // could stamp employee.lastWinnerDate for a win that employee never
    // received (with no admin-facing way to undo it — see
    // adminEmployeeValidators.ts's exclusion of lastWinnerDate from
    // admin edits) and, worse, flip paymentStatus to PAID and make
    // recordHandover() below willing to hand the device to the wrong
    // person.
    if (await winnerRepository.findByRedrawOf(id)) {
      throw new AppError(409, "Cannot record payment for a winner who has already been redrawn");
    }
    // Re-confirming an already-PAID winner as PAID again would silently
    // re-stamp lastWinnerDate with a fresh timestamp for no reason —
    // blocked the same way recordHandover() below blocks a repeat
    // handover. PAID -> NON_PAYMENT (below) stays allowed: correcting a
    // mistaken PAID is a legitimate admin action, just not a no-op PAID
    // -> PAID.
    const isPaid = input.paymentStatus === "PAID";
    if (isPaid && winner.paymentStatus === "PAID") {
      throw new AppError(409, "This winner has already been marked as paid");
    }
    // paymentMethod/paymentDate are only meaningful for PAID — clearing
    // them on NON_PAYMENT keeps the record honest if an admin corrects a
    // mistaken PAID back to NON_PAYMENT rather than leaving stale values.
    const paymentData = {
      paymentStatus: input.paymentStatus,
      paymentMethod: isPaid ? (input.paymentMethod ?? null) : null,
      paymentDate: isPaid ? new Date() : null,
    };

    // employee.lastWinnerDate (the PRD's 24-month re-entry cooldown, see
    // eligibilityService.checkEmployeeAttributes()) is deliberately
    // stamped here — at payment confirmation — rather than at draw-time
    // selection (drawService.runDraw()/redrawWinner() no longer touch
    // it). A candidate who is merely *selected* hasn't won anything yet
    // in any sense that should cost them a future raffle: if they
    // decline, don't pay in time, don't show, or an admin overrides the
    // result, drawService.redrawWinner() replaces them without ever
    // reaching this path, so their cooldown is correctly never started.
    // PAID is also already this codebase's own "point of no return" for
    // a winner (redrawWinner() itself refuses to redraw a PAID winner),
    // so anchoring the cooldown to the same event keeps both rules
    // consistent with each other.
    if (!isPaid) {
      return winnerRepository.updatePayment(id, paymentData);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await winnerRepository.updatePayment(id, paymentData, tx);
      await employeeRepository.markAsWinner(winner.employeeId, tx);
      return updated;
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
