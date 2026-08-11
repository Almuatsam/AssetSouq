import { useQuery } from "@tanstack/react-query";

import { dashboardService } from "@/services/dashboardService";

// Exported (not inlined) so a future mutation that changes device/employee/
// registration state elsewhere can invalidate this cache too, matching the
// convention in hooks/useAdminRegistrations.ts's ADMIN_REGISTRATIONS_QUERY_KEY.
export const DASHBOARD_STATS_QUERY_KEY = ["admin", "dashboard", "stats"] as const;

export function useDashboardStats() {
  return useQuery({ queryKey: DASHBOARD_STATS_QUERY_KEY, queryFn: dashboardService.getStats });
}
