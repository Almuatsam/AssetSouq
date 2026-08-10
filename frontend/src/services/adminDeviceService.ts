import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type { CreateDeviceInput, Device, DeviceStatus, UpdateDeviceInput } from "@/types/device";

export const adminDeviceService = {
  async listAll(status?: DeviceStatus): Promise<Device[]> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ devices: Device[] }>>("/admin/devices", {
        params: status ? { status } : undefined,
      });
      return res.data.data!.devices;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async create(data: CreateDeviceInput): Promise<Device> {
    try {
      const res = await apiClient.post<ApiEnvelope<{ device: Device }>>("/admin/devices", data);
      return res.data.data!.device;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async update(id: number, data: UpdateDeviceInput): Promise<Device> {
    try {
      const res = await apiClient.patch<ApiEnvelope<{ device: Device }>>(`/admin/devices/${id}`, data);
      return res.data.data!.device;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
