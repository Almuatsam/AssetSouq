import type { Draw, RedrawReason, Winner } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import { auditLogRepository } from "../repositories/auditLogRepository";
import { deviceRepository } from "../repositories/deviceRepository";
import type { DrawWithWinners } from "../repositories/drawRepository";
import { drawRepository } from "../repositories/drawRepository";
import { employeeRepository } from "../repositories/employeeRepository";
import { registrationRepository } from "../repositories/registrationRepository";
import { winnerRepository } from "../repositories/winnerRepository";
import { generateSeed, seededShuffle } from "../utils/rng";
import { eligibilityService } from "./eligibilityService";

// Walks `candidatePool` in order, skipping anyone in `excludeEmployeeIds`
// and re-validating each remaining candidate's employee-level eligibility
// right now, returning the first who qualifies (or null if the waiting
// list is exhausted). Shared by redrawWinner()'s pre-transaction fast-fail
// check and its authoritative, lock-protected re-selection — see the
// comment on that second call site for why both are needed.
async function selectNextEligibleCandidate(
  candidatePool: number[],
  excludeEmployeeIds: ReadonlySet<number>,
): Promise<number | null> {
  for (const employeeId of candidatePool) {
    if (excludeEmployeeIds.has(employeeId)) continue;
    const employee = await employeeRepository.findById(employeeId);
    if (employee && eligibilityService.checkEmployeeAttributes(employee).eligible) {
      return employeeId;
    }
  }
  return null;
}

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

  // Admin-only surface (see routes/adminWinnerRoutes.ts — mounted under
  // /admin/winners/:id/redraw, since the action targets a specific winner
  // slot). Implements docs/03-App-Flow.md's "Draw Flow (detail)" step 6:
  // when a winner declines, doesn't pay, doesn't show, or an admin
  // overrides the result, this re-runs selection against the *same*
  // draw's original shuffled pool — not a fresh random draw — walking it
  // in order past anyone already a winner for this draw, and picks the
  // first candidate who's still eligible today.
  async redrawWinner(winnerId: number, reason: RedrawReason, adminId: number): Promise<Winner> {
    const originalWinner = await winnerRepository.findById(winnerId);
    if (!originalWinner) {
      throw new AppError(404, "Winner not found");
    }
    if (originalWinner.paymentStatus === "PAID") {
      throw new AppError(409, "Cannot redraw a winner who has already paid");
    }
    if (!originalWinner.drawId) {
      // Every winner created by runDraw() has a drawId; drawId is only
      // nullable in the schema for forward-compatibility. Defensive, not
      // expected to be reachable in practice.
      throw new AppError(409, "This winner has no associated draw to redraw against");
    }
    if (await winnerRepository.findByRedrawOf(winnerId)) {
      throw new AppError(409, "This winner has already been redrawn");
    }

    const draw = await drawRepository.findByIdWithWinners(originalWinner.drawId);
    if (!draw) {
      throw new AppError(404, "Draw not found");
    }
    const device = await deviceRepository.findById(draw.deviceId);
    if (!device) {
      throw new AppError(404, "Device not found");
    }

    // Draw.candidatePoolSnapshot is a Prisma Json column (typed as
    // Prisma.JsonValue), so it isn't statically known to be a number[] —
    // but it's exactly what runDraw() wrote into it (see
    // drawRepository.ts's CreateDrawData), so this cast is safe.
    const candidatePool = draw.candidatePoolSnapshot as number[];

    // Fast pre-transaction check: fail fast (no lock, no transaction) if
    // the waiting list is obviously exhausted already. This pick is
    // *not* what actually gets used to create the replacement — see the
    // authoritative re-selection under the draw lock below, which is
    // what closes the real race this pre-check can't.
    const currentWinnerEmployeeIds = new Set(draw.winners.map((winner) => winner.employeeId));
    if ((await selectNextEligibleCandidate(candidatePool, currentWinnerEmployeeIds)) === null) {
      throw new AppError(409, "No remaining eligible candidates in the waiting list");
    }

    return prisma.$transaction(async (tx) => {
      // Lock the *draw*, not just the winner being redrawn — the
      // contested resource here is "who's the next eligible waiting-list
      // candidate", which is shared across every winner slot on this
      // draw, not scoped to any one of them. Two concurrent redraws of
      // two *different* winner slots on the same draw could otherwise
      // both compute the same next-in-line candidate before either
      // commits (locking only the specific winnerId wouldn't catch
      // that — they're different rows). Locking the draw serializes
      // every redraw against it, the same way runDraw()'s device lock
      // serializes every draw attempt against that device.
      await drawRepository.lockForUpdate(draw.id, tx);

      const lockedWinner = await winnerRepository.findById(winnerId, tx);
      if (!lockedWinner) {
        throw new AppError(404, "Winner not found");
      }
      if (lockedWinner.paymentStatus === "PAID") {
        throw new AppError(409, "Cannot redraw a winner who has already paid");
      }
      if (await winnerRepository.findByRedrawOf(winnerId, tx)) {
        throw new AppError(409, "This winner has already been redrawn");
      }

      // Re-run selection from scratch against a fresh read of the draw's
      // current winners, taken *after* acquiring the lock — this is the
      // authoritative pick, not the pre-check above. Any winner created
      // by a concurrent redraw that committed while this call was
      // waiting for the lock is now visible here and correctly excluded.
      const lockedDraw = await drawRepository.findByIdWithWinners(draw.id, tx);
      if (!lockedDraw) {
        throw new AppError(404, "Draw not found");
      }
      const lockedCurrentWinnerEmployeeIds = new Set(lockedDraw.winners.map((winner) => winner.employeeId));
      const nextWinnerEmployeeId = await selectNextEligibleCandidate(
        candidatePool,
        lockedCurrentWinnerEmployeeIds,
      );
      if (nextWinnerEmployeeId === null) {
        throw new AppError(409, "No remaining eligible candidates in the waiting list");
      }

      const newWinner = await drawRepository.createWinner(
        {
          employeeId: nextWinnerEmployeeId,
          deviceId: draw.deviceId,
          drawId: draw.id,
          priceDue: device.price,
          redrawOf: winnerId,
          redrawReason: reason,
        },
        tx,
      );
      await employeeRepository.markAsWinner(nextWinnerEmployeeId, tx);
      await auditLogRepository.create(
        { adminId, action: "REDRAW_WINNER", entity: "Winner", entityId: newWinner.id },
        tx,
      );

      return newWinner;
    });
  },
};
