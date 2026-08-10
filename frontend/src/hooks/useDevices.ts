import { useQuery } from "@tanstack/react-query";

import { deviceService } from "@/services/deviceService";

export function useDevices() {
  return useQuery({ queryKey: ["devices"], queryFn: deviceService.listAvailable });
}

export function useDevice(id: number) {
  return useQuery({
    queryKey: ["devices", id],
    queryFn: () => deviceService.getById(id),
    enabled: Number.isFinite(id),
  });
}
