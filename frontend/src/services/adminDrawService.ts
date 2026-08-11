import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type { Draw } from "@/types/winner";

export const adminDrawService = {
  async run(deviceId: number): Promise<Draw> {
    try {
      const res = await apiClient.post<ApiEnvelope<{ draw: Draw }>>("/admin/draws", { deviceId });
      return res.data.data!.draw;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
