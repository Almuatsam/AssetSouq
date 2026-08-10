import { useMutation, useQueryClient } from "@tanstack/react-query";

import { MY_REGISTRATION_QUERY_KEY } from "@/hooks/useMyRegistration";
import { registrationService } from "@/services/registrationService";

export function useRegisterInterest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, agreed }: { deviceId: number; agreed: boolean }) =>
      registrationService.registerInterest(deviceId, agreed),
    onSuccess: () => {
      // The devices/registration-status view reads from this cache key —
      // refetch it so the UI flips from "browse devices" to "registered"
      // without a manual reload.
      queryClient.invalidateQueries({ queryKey: MY_REGISTRATION_QUERY_KEY });
    },
  });
}
