import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { deviceService } from "@/services/deviceService";
import type { Device } from "@/types/device";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

const baseDevice: Device = {
  id: 1,
  assetTag: "AST-001",
  deviceType: "Laptop",
  brand: "Dell",
  model: "Latitude 5420",
  cpu: "i5-1135G7",
  ram: "16GB",
  storage: "256GB SSD",
  purchaseYear: 2021,
  yearsUsed: 4,
  price: "150.00",
  status: "AVAILABLE",
  quantity: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("deviceService.listAvailable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the list of available devices", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { devices: [baseDevice] } } });

    // Act
    const result = await deviceService.listAvailable();

    // Assert
    expect(result).toEqual([baseDevice]);
    expect(mockedGet).toHaveBeenCalledWith("/devices");
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(deviceService.listAvailable()).rejects.toThrow(/went wrong/i);
  });
});

describe("deviceService.getById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the requested device", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { device: baseDevice } } });

    // Act
    const result = await deviceService.getById(1);

    // Assert
    expect(result).toEqual(baseDevice);
    expect(mockedGet).toHaveBeenCalledWith("/devices/1");
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(deviceService.getById(1)).rejects.toThrow(/went wrong/i);
  });
});
