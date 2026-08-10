import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type { Registration } from "@/types/device";

export const registrationService = {
  async registerInterest(deviceId: number, agreed: boolean): Promise<Registration> {
    try {
      const res = await apiClient.post<ApiEnvelope<{ registration: Registration }>>("/registrations", {
        deviceId,
        agreed,
      });
      return res.data.data!.registration;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async getMine(): Promise<Registration | null> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ registration: Registration | null }>>(
        "/registrations/me",
      );
      return res.data.data!.registration;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
