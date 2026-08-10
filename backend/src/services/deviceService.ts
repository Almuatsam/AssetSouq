import type { Device, DeviceStatus } from "@prisma/client";

import { deviceRepository } from "../repositories/deviceRepository";
import { AppError } from "../middlewares/errorHandler";
import type { CreateDeviceInput, UpdateDeviceInput } from "../validators/adminDeviceValidators";

// DRAWN and SOLD are set exclusively by the (future, Phase 4) draw and
// payment workflows — never by this generic admin edit endpoint. Only
// the reversible AVAILABLE <-> REMOVED transition (PRD business rule 8)
// is allowed here. Without this map, a caller could flip a DRAWN/SOLD
// device to AVAILABLE and then immediately to REMOVED in a second call,
// bypassing the "only an available device can be removed" guard below —
// two legal single-field edits combining into an illegal state change.
const ALLOWED_STATUS_TRANSITIONS: Partial<Record<DeviceStatus, DeviceStatus[]>> = {
  AVAILABLE: ["REMOVED"],
  REMOVED: ["AVAILABLE"],
};

export const deviceService = {
  listAvailable(): Promise<Device[]> {
    return deviceRepository.findAvailable();
  },

  async getById(id: number): Promise<Device> {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new AppError(404, "Device not found");
    }
    return device;
  },

  // --- Admin-only surface below (routes/adminDeviceRoutes.ts) ---

  listAll(status?: DeviceStatus): Promise<Device[]> {
    return deviceRepository.findAll(status);
  },

  async createDevice(data: CreateDeviceInput): Promise<Device> {
    const existing = await deviceRepository.findByAssetTag(data.assetTag);
    if (existing) {
      throw new AppError(409, "A device with this asset tag already exists");
    }
    return deviceRepository.create(data);
  },

  async updateDevice(id: number, data: UpdateDeviceInput): Promise<Device> {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new AppError(404, "Device not found");
    }

    // Business rule 8 (docs/01-PRD.md): "Admin Can Remove Device Before
    // Draw" — once a device has moved past AVAILABLE (drawn/sold), pulling
    // it back out from under an in-flight or completed raffle isn't a
    // "remove", it's data corruption. Enforced as a real state machine
    // (not just a single-direction check) — see ALLOWED_STATUS_TRANSITIONS.
    if (data.status && data.status !== device.status) {
      const allowedNext = ALLOWED_STATUS_TRANSITIONS[device.status] ?? [];
      if (!allowedNext.includes(data.status)) {
        throw new AppError(409, `Cannot change device status from ${device.status} to ${data.status}`);
      }
    }

    return deviceRepository.update(id, data);
  },
};
