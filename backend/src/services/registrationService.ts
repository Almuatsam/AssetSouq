import type { Registration } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";
import { deviceRepository } from "../repositories/deviceRepository";
import type { RegistrationWithDevice } from "../repositories/registrationRepository";
import { registrationRepository } from "../repositories/registrationRepository";
import { eligibilityService } from "./eligibilityService";

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
};
