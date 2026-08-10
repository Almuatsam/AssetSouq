import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminDeviceService } from "@/services/adminDeviceService";
import type { CreateDeviceInput, DeviceStatus, UpdateDeviceInput } from "@/types/device";

const ADMIN_DEVICES_QUERY_KEY = ["admin", "devices"] as const;

export function useAdminDevices(status?: DeviceStatus) {
  return useQuery({
    queryKey: [...ADMIN_DEVICES_QUERY_KEY, status ?? "ALL"],
    queryFn: () => adminDeviceService.listAll(status),
  });
}

// Admin writes (create/update) change the same device rows the employee-facing
// useDevices()/useDevice() hooks cache under ["devices"]/["devices", id] — see
// hooks/useDevices.ts. Invalidating both prefixes keeps the employee device
// list/detail views from serving stale price/status data after an admin edit.
function invalidateDeviceCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ADMIN_DEVICES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["devices"] });
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
