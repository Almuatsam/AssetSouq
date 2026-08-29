import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { onboardingService } from "@/services/onboardingService";
import type { UpdateOnboardingInput } from "@/types/onboarding";

export const ONBOARDING_PROGRESS_QUERY_KEY = ["onboarding", "me"] as const;

// `enabled` is required (not defaulted to true) — TourProvider is mounted
// once, globally, regardless of whether a session exists yet (login pages
// have none), so the caller must explicitly gate this on `!!session`
// rather than firing an authenticated request with no token.
export function useOnboardingProgress(enabled: boolean) {
  return useQuery({
    queryKey: ONBOARDING_PROGRESS_QUERY_KEY,
    queryFn: onboardingService.getMine,
    enabled,
  });
}

export function useUpdateOnboardingProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: UpdateOnboardingInput) => onboardingService.updateMine(patch),
    onSuccess: (progress) => {
      queryClient.setQueryData(ONBOARDING_PROGRESS_QUERY_KEY, progress);
    },
  });
}
