import type { DeviceStatus, RegistrationStatus } from "@/types/device";

// Mirrors backend/src/services/dashboardService.ts's DashboardStats.
export interface DashboardStats {
  devices: Record<DeviceStatus, number> & { total: number };
  employees: { total: number; active: number; eligible: number };
  registrations: Record<RegistrationStatus, number> & { total: number };
}
