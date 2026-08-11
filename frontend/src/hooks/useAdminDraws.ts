import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateDeviceCaches } from "@/hooks/useAdminDevices";
import { ADMIN_WINNERS_QUERY_KEY } from "@/hooks/useAdminWinners";
import { adminDrawService } from "@/services/adminDrawService";

export function useRunDraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: number) => adminDrawService.run(deviceId),
    onSuccess: () => {
      // A successful draw flips the device to DRAWN (same caches an
      // admin device edit invalidates) and creates new Winner rows (the
      // admin winners list, if already loaded, should reflect them too).
      invalidateDeviceCaches(queryClient);
      queryClient.invalidateQueries({ queryKey: ADMIN_WINNERS_QUERY_KEY });
    },
  });
}
