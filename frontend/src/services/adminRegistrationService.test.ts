import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { adminRegistrationService } from "@/services/adminRegistrationService";
import type { AdminRegistrationRow, Registration } from "@/types/device";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = apiClient.patch as unknown as ReturnType<typeof vi.fn>;

const baseRegistration: AdminRegistrationRow = {
  id: 1,
  employeeId: 10,
  deviceId: 1,
  agreed: true,
  submittedAt: "2026-01-01T00:00:00.000Z",
  status: "ELIGIBLE",
  employee: { id: 10, staffNumber: "S1001", name: "Jane Doe", department: "Engineering" },
  device: {
    id: 1,
    assetTag: "AST-001",
    deviceType: "Laptop",
    brand: "Dell",
    model: "Latitude 5420",
    price: "150.00",
    status: "AVAILABLE",
  },
};

describe("adminRegistrationService.listAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists every registration with no filter by default", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { registrations: [baseRegistration] } } });

    // Act
    const result = await adminRegistrationService.listAll();

    // Assert
    expect(result).toEqual([baseRegistration]);
    expect(mockedGet).toHaveBeenCalledWith("/admin/registrations", { params: undefined });
  });

  it("passes filters as query params", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { registrations: [] } } });

    // Act
    await adminRegistrationService.listAll({ status: "ELIGIBLE", search: "Jane" });

    // Assert
    expect(mockedGet).toHaveBeenCalledWith("/admin/registrations", {
      params: { status: "ELIGIBLE", search: "Jane" },
    });
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminRegistrationService.listAll()).rejects.toThrow(/went wrong/i);
  });
});

describe("adminRegistrationService.updateStatus", () => {
  const updatedRegistration: Registration = {
    id: 1,
    employeeId: 10,
    deviceId: 1,
    agreed: true,
    submittedAt: "2026-01-01T00:00:00.000Z",
    status: "WITHDRAWN",
    device: baseRegistration.device,
  };

  beforeEach(() => vi.clearAllMocks());

  it("updates the registration's status", async () => {
    // Arrange
    mockedPatch.mockResolvedValue({ data: { success: true, data: { registration: updatedRegistration } } });

    // Act
    const result = await adminRegistrationService.updateStatus(1, "WITHDRAWN");

    // Assert
    expect(result.status).toBe("WITHDRAWN");
    expect(mockedPatch).toHaveBeenCalledWith("/admin/registrations/1", { status: "WITHDRAWN" });
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedPatch.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminRegistrationService.updateStatus(1, "WITHDRAWN")).rejects.toThrow(/went wrong/i);
  });
});
