import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type { OnboardingProgress, UpdateOnboardingInput } from "@/types/onboarding";

export const onboardingService = {
  async getMine(): Promise<OnboardingProgress> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ progress: OnboardingProgress }>>("/onboarding/me");
      return res.data.data!.progress;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async updateMine(patch: UpdateOnboardingInput): Promise<OnboardingProgress> {
    try {
      const res = await apiClient.patch<ApiEnvelope<{ progress: OnboardingProgress }>>(
        "/onboarding/me",
        patch,
      );
      return res.data.data!.progress;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
