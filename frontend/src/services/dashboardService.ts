import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type { DashboardStats } from "@/types/dashboard";

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ stats: DashboardStats }>>("/admin/dashboard/stats");
      return res.data.data!.stats;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
