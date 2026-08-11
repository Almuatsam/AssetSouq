import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type { Winner, WinnerListFilters } from "@/types/winner";

export const adminWinnerService = {
  async listAll(filters?: WinnerListFilters): Promise<Winner[]> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ winners: Winner[] }>>("/admin/winners", {
        params: filters,
      });
      return res.data.data!.winners;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
