import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminWinnerService } from "@/services/adminWinnerService";
import type { RecordPaymentInput, RedrawReason, WinnerListFilters } from "@/types/winner";

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

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RecordPaymentInput }) =>
      adminWinnerService.recordPayment(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_WINNERS_QUERY_KEY }),
  });
}

export function useRecordHandover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminWinnerService.recordHandover(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_WINNERS_QUERY_KEY }),
  });
}

export function useRedrawWinner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: RedrawReason }) =>
      adminWinnerService.redraw(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_WINNERS_QUERY_KEY }),
  });
}
