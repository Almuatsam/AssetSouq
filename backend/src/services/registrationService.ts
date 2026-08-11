import type { Registration, RegistrationStatus } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import { deviceRepository } from "../repositories/deviceRepository";
import type {
  RegistrationAdminRow,
  RegistrationListFilters,
  RegistrationWithDevice,
} from "../repositories/registrationRepository";
import { registrationRepository } from "../repositories/registrationRepository";
import { eligibilityService } from "./eligibilityService";

// An admin can end a registration (ELIGIBLE/PENDING -> INELIGIBLE or
// WITHDRAWN) but not revive one — INELIGIBLE/WITHDRAWN are terminal here
// (absent as keys below, so they resolve to an empty allow-list). Reviving
// one would need to re-run the full eligibility check (the employee may
// since have registered elsewhere, been deactivated, etc.), which is
// disproportionate to build before the draw engine (Phase 4) exists to
// actually consume this data; simplest safe rule for now is that a closed
// case stays closed.
//
// PENDING -> ELIGIBLE is also allowed, even though registerInterest()
// always writes ELIGIBLE directly today (PENDING is currently unreachable
// via that path) — defense-in-depth in case a row is ever created/left in
// PENDING (it's the Prisma column's own default) by a future code path.
const ALLOWED_REGISTRATION_TRANSITIONS: Partial<Record<RegistrationStatus, RegistrationStatus[]>> = {
  PENDING: ["ELIGIBLE", "INELIGIBLE", "WITHDRAWN"],
  ELIGIBLE: ["INELIGIBLE", "WITHDRAWN"],
};

export const registrationService = {
  async registerInterest(employeeId: number, deviceId: number, agreed: boolean): Promise<Registration> {
    if (!agreed) {
      throw new AppError(400, "You must agree to the Terms & Conditions");
    }

    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new AppError(404, "Device not found");
    }
    if (device.status !== "AVAILABLE") {
      throw new AppError(409, "This device is no longer available for registration");
    }

    // Fails fast on the common cases (inactive, laptop holder, cooldown,
    // etc.) without taking a lock.
    const eligibility = await eligibilityService.checkEmployee(employeeId);
    if (!eligibility.eligible) {
      throw new AppError(403, eligibility.reasons.join("; "));
    }

    // Re-check "no active registration" under a row lock, in a
    // transaction: eligibilityService's check above and this create() are
    // two separate round-trips, so without this, two concurrent requests
    // from the same employee could both pass the check before either
    // create() lands, producing two active registrations for one
    // employee (violates PRD business rules 2 & 5).
    return prisma.$transaction(async (tx) => {
      await registrationRepository.lockEmployeeForUpdate(employeeId, tx);

      const stillActive = await registrationRepository.findActiveByEmployeeId(employeeId, tx);
      if (stillActive) {
        throw new AppError(403, "Already has an active registration for a device");
      }

      return registrationRepository.create({ employeeId, deviceId, agreed }, tx);
    });
  },

  getMyRegistration(employeeId: number): Promise<RegistrationWithDevice | null> {
    return registrationRepository.findLatestByEmployeeId(employeeId);
  },

  // --- Admin-only surface below (routes/adminRegistrationRoutes.ts) ---

  listAllForAdmin(filters: RegistrationListFilters): Promise<RegistrationAdminRow[]> {
    return registrationRepository.findAllForAdmin(filters);
  },

  async updateStatus(id: number, status: RegistrationStatus): Promise<Registration> {
    const registration = await registrationRepository.findById(id);
    if (!registration) {
      throw new AppError(404, "Registration not found");
    }

    if (status !== registration.status) {
      const allowedNext = ALLOWED_REGISTRATION_TRANSITIONS[registration.status] ?? [];
      if (!allowedNext.includes(status)) {
        throw new AppError(
          409,
          `Cannot change registration status from ${registration.status} to ${status}`,
        );
      }
    }

    return registrationRepository.updateStatus(id, status);
  },
};
