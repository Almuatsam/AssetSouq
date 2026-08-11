import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DASHBOARD_STATS_QUERY_KEY } from "@/hooks/useDashboardStats";
import { adminDeviceService } from "@/services/adminDeviceService";
import type { CreateDeviceInput, DeviceStatus, UpdateDeviceInput } from "@/types/device";

const ADMIN_DEVICES_QUERY_KEY = ["admin", "devices"] as const;

export function useAdminDevices(status?: DeviceStatus) {
  return useQuery({
    queryKey: [...ADMIN_DEVICES_QUERY_KEY, status ?? "ALL"],
    queryFn: () => adminDeviceService.listAll(status),
  });
}

// Admin writes (create/update/draw) change the same device rows the
// employee-facing useDevices()/useDevice() hooks cache under
// ["devices"]/["devices", id] — see hooks/useDevices.ts — and can shift the
// admin dashboard's devicesByStatus breakdown, cached under
// DASHBOARD_STATS_QUERY_KEY — see hooks/useDashboardStats.ts. Invalidating
// all three here, once, keeps every device-derived cache in sync after any
// admin device write rather than each mutation hook keeping its own
// (driftable) copy of "which caches represent devices". Exported so
// useAdminDraws.ts's useRunDraw() — which also flips a device's status —
// reuses this instead of duplicating it.
export function invalidateDeviceCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ADMIN_DEVICES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["devices"] });
  queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_QUERY_KEY });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeviceInput) => adminDeviceService.create(data),
    onSuccess: () => invalidateDeviceCaches(queryClient),
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDeviceInput }) =>
      adminDeviceService.update(id, data),
    onSuccess: () => invalidateDeviceCaches(queryClient),
  });
}
