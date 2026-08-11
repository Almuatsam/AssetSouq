import type { DeviceStatus, RegistrationStatus } from "@prisma/client";

import { deviceRepository } from "../repositories/deviceRepository";
import { employeeRepository } from "../repositories/employeeRepository";
import { registrationRepository } from "../repositories/registrationRepository";

export interface DashboardStats {
  devices: Record<DeviceStatus, number> & { total: number };
  employees: { total: number; active: number; eligible: number };
  registrations: Record<RegistrationStatus, number> & { total: number };
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

export const dashboardService = {
  // Admin-only surface (see routes/adminDashboardRoutes.ts). Runs the
  // three repositories' count queries in parallel — they're independent,
  // no reason to pay three round-trips sequentially for one summary.
  async getStats(): Promise<DashboardStats> {
    const [deviceCounts, employeeCounts, registrationCounts] = await Promise.all([
      deviceRepository.countByStatus(),
      employeeRepository.countStats(),
      registrationRepository.countByStatus(),
    ]);

    return {
      devices: { ...deviceCounts, total: sumCounts(deviceCounts) },
      employees: employeeCounts,
      registrations: { ...registrationCounts, total: sumCounts(registrationCounts) },
    };
  },
};
