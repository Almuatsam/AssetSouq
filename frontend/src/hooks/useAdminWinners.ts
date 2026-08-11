import { useQuery } from "@tanstack/react-query";

import { adminWinnerService } from "@/services/adminWinnerService";
import type { WinnerListFilters } from "@/types/winner";

// Exported so useAdminDraws.ts's useRunDraw() can invalidate this exact
// cache after a successful draw, without keeping a second, driftable
// copy of the key.
export const ADMIN_WINNERS_QUERY_KEY = ["admin", "winners"] as const;

export function useAdminWinners(filters?: WinnerListFilters) {
  return useQuery({
    queryKey: [...ADMIN_WINNERS_QUERY_KEY, filters ?? {}],
    queryFn: () => adminWinnerService.listAll(filters),
  });
}
