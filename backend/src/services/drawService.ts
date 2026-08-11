import type { Draw } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import { deviceRepository } from "../repositories/deviceRepository";
import type { DrawWithWinners } from "../repositories/drawRepository";
import { drawRepository } from "../repositories/drawRepository";
import { employeeRepository } from "../repositories/employeeRepository";
import { registrationRepository } from "../repositories/registrationRepository";
import { generateSeed, seededShuffle } from "../utils/rng";
import { eligibilityService } from "./eligibilityService";

export const drawService = {
  // Admin-only surface (see routes/adminDrawRoutes.ts). Implements
  // docs/03-App-Flow.md's "Draw Flow (detail)": pulls the eligible
  // candidate pool for the device, selects device.quantity winners via a
  // seeded shuffle (all winners for a multi-unit device in one draw, not
  // one raffle per unit), and records the full shuffled pool + seed for
  // audit (the un-won remainder becomes the waiting list a future redraw
  // draws from — see docs/06-Engineering-Plan.md Phase 4).
  async runDraw(deviceId: number, adminId: number): Promise<DrawWithWinners> {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new AppError(404, "Device not found");
    }
    if (device.status !== "AVAILABLE") {
      throw new AppError(409, `Cannot run a draw for a device that is ${device.status}, not AVAILABLE`);
    }

    const registrations = await registrationRepository.findEligibleByDeviceId(deviceId);

    // Re-validate each candidate's employee-level eligibility at draw
    // time — active/laptopHolder/cooldown status may have changed since
    // they registered. Deliberately uses checkEmployeeAttributes(), not
    // the full checkEmployee(): the latter's "no other active
    // registration" check would find the very ELIGIBLE registration being
    // evaluated here and disqualify every single candidate, every time
    // (see the comment on checkEmployeeAttributes in eligibilityService.ts).
    const eligibleEmployeeIds: number[] = [];
    for (const registration of registrations) {
      const employee = await employeeRepository.findById(registration.employeeId);
      if (employee && eligibilityService.checkEmployeeAttributes(employee).eligible) {
        eligibleEmployeeIds.push(employee.id);
      }
    }

    if (eligibleEmployeeIds.length === 0) {
      throw new AppError(409, "No eligible candidates to draw from");
    }

    const rngSeed = generateSeed();
    // The full shuffled pool is persisted below regardless of how many
    // actually win — slicing here only picks who wins *this* draw, it
    // doesn't shrink what gets recorded as the audit trail.
    const shuffledPool = seededShuffle(eligibleEmployeeIds, rngSeed);
    const winnerEmployeeIds = shuffledPool.slice(0, device.quantity);

    const draw: Draw = await prisma.$transaction(async (tx) => {
      // Re-verify AVAILABLE atomically under a row lock — the check at
      // the top of this function ran outside any transaction, with a
      // non-trivial amount of async work (the eligibility loop above) in
      // between, so two concurrent runDraw() calls for the same device
      // could otherwise both pass that check before either commits and
      // both go on to draw the same device twice. The lock forces the
      // second transaction to wait for the first to commit, then see the
      // now-DRAWN status and abort here instead.
      await deviceRepository.lockForUpdate(deviceId, tx);
      const lockedDevice = await deviceRepository.findById(deviceId, tx);
      if (!lockedDevice || lockedDevice.status !== "AVAILABLE") {
        throw new AppError(
          409,
          `Cannot run a draw for a device that is ${lockedDevice?.status ?? "missing"}, not AVAILABLE`,
        );
      }

      const createdDraw = await drawRepository.create(
        { deviceId, rngSeed, candidatePoolSnapshot: shuffledPool, drawnByAdminId: adminId },
        tx,
      );

      for (const employeeId of winnerEmployeeIds) {
        await drawRepository.createWinner(
          { employeeId, deviceId, drawId: createdDraw.id, priceDue: device.price },
          tx,
        );
        await employeeRepository.markAsWinner(employeeId, tx);
      }

      await deviceRepository.markDrawn(deviceId, tx);

      return createdDraw;
    });

    const result = await drawRepository.findByIdWithWinners(draw.id);
    if (!result) {
      // Unreachable in practice — the transaction above just committed
      // this exact row — but narrows the type for the caller rather than
      // asserting with `!`.
      throw new AppError(500, "Draw was created but could not be reloaded");
    }
    return result;
  },
};
