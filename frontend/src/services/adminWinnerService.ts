import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type { RecordPaymentInput, RedrawReason, Winner, WinnerListFilters } from "@/types/winner";

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

  async recordPayment(id: number, data: RecordPaymentInput): Promise<Winner> {
    try {
      const res = await apiClient.patch<ApiEnvelope<{ winner: Winner }>>(
        `/admin/winners/${id}/payment`,
        data,
      );
      return res.data.data!.winner;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async recordHandover(id: number): Promise<Winner> {
    try {
      const res = await apiClient.patch<ApiEnvelope<{ winner: Winner }>>(
        `/admin/winners/${id}/handover`,
        {},
      );
      return res.data.data!.winner;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async redraw(id: number, reason: RedrawReason): Promise<Winner> {
    try {
      const res = await apiClient.post<ApiEnvelope<{ winner: Winner }>>(`/admin/winners/${id}/redraw`, {
        reason,
      });
      return res.data.data!.winner;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
