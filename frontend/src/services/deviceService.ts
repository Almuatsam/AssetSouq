import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type { Device } from "@/types/device";

export const deviceService = {
  async listAvailable(): Promise<Device[]> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ devices: Device[] }>>("/devices");
      return res.data.data!.devices;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async getById(id: number): Promise<Device> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ device: Device }>>(`/devices/${id}`);
      return res.data.data!.device;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
