import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { adminDeviceService } from "@/services/adminDeviceService";
import type { Device } from "@/types/device";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = apiClient.patch as unknown as ReturnType<typeof vi.fn>;

function axiosErrorWith(data: unknown): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    data,
    status: 409,
    statusText: "Conflict",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

const baseDevice: Device = {
  id: 1,
  assetTag: "AST-001",
  deviceType: "Laptop",
  brand: "Dell",
  model: "Latitude 5420",
  cpu: null,
  ram: null,
  storage: null,
  purchaseYear: null,
  yearsUsed: null,
  price: "150.00",
  status: "AVAILABLE",
  quantity: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("adminDeviceService.listAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists every device with no filter by default", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { devices: [baseDevice] } } });

    // Act
    const result = await adminDeviceService.listAll();

    // Assert
    expect(result).toEqual([baseDevice]);
    expect(mockedGet).toHaveBeenCalledWith("/admin/devices", { params: undefined });
  });

  it("passes a status filter as a query param", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { devices: [] } } });

    // Act
    await adminDeviceService.listAll("REMOVED");

    // Assert
    expect(mockedGet).toHaveBeenCalledWith("/admin/devices", { params: { status: "REMOVED" } });
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminDeviceService.listAll()).rejects.toThrow(/went wrong/i);
  });
});

describe("adminDeviceService.create", () => {
  const input = { assetTag: "AST-002", deviceType: "Laptop", brand: "HP", model: "840", price: 200 };

  beforeEach(() => vi.clearAllMocks());

  it("creates the device", async () => {
    // Arrange
    mockedPost.mockResolvedValue({ data: { success: true, data: { device: { ...baseDevice, ...input } } } });

    // Act
    const result = await adminDeviceService.create(input);

    // Assert
    expect(result.assetTag).toBe("AST-002");
    expect(mockedPost).toHaveBeenCalledWith("/admin/devices", input);
  });

  it("surfaces a duplicate-asset-tag error from the backend", async () => {
    // Arrange
    mockedPost.mockRejectedValue(
      axiosErrorWith({ success: false, error: "A device with this asset tag already exists" }),
    );

    // Act / Assert
    await expect(adminDeviceService.create(input)).rejects.toThrow(/already exists/i);
  });
});

describe("adminDeviceService.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the device", async () => {
    // Arrange
    mockedPatch.mockResolvedValue({ data: { success: true, data: { device: { ...baseDevice, price: "175.00" } } } });

    // Act
    const result = await adminDeviceService.update(1, { price: 175 });

    // Assert
    expect(result.price).toBe("175.00");
    expect(mockedPatch).toHaveBeenCalledWith("/admin/devices/1", { price: 175 });
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedPatch.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminDeviceService.update(1, { price: 175 })).rejects.toThrow(/went wrong/i);
  });
});
