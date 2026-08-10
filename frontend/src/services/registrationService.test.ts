import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { registrationService } from "@/services/registrationService";
import type { Registration } from "@/types/device";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;

const baseRegistration: Registration = {
  id: 1,
  employeeId: 10,
  deviceId: 1,
  agreed: true,
  submittedAt: "2026-01-01T00:00:00.000Z",
  status: "ELIGIBLE",
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

describe("registrationService.registerInterest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits the registration and returns the result", async () => {
    // Arrange
    mockedPost.mockResolvedValue({ data: { success: true, data: { registration: baseRegistration } } });

    // Act
    const result = await registrationService.registerInterest(1, true);

    // Assert
    expect(result).toEqual(baseRegistration);
    expect(mockedPost).toHaveBeenCalledWith("/registrations", { deviceId: 1, agreed: true });
  });

  it("surfaces an ineligibility reason from the backend", async () => {
    // Arrange
    mockedPost.mockRejectedValue(
      new AxiosError("Request failed", undefined, undefined, undefined, {
        data: { success: false, error: "Laptop holders cannot participate" },
        status: 403,
        statusText: "Forbidden",
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    );

    // Act / Assert
    await expect(registrationService.registerInterest(1, true)).rejects.toThrow(
      "Laptop holders cannot participate",
    );
  });
});

describe("registrationService.getMine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the employee's current registration", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { registration: baseRegistration } } });

    // Act
    const result = await registrationService.getMine();

    // Assert
    expect(result).toEqual(baseRegistration);
    expect(mockedGet).toHaveBeenCalledWith("/registrations/me");
  });

  it("returns null when the employee has never registered", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { registration: null } } });

    // Act
    const result = await registrationService.getMine();

    // Assert
    expect(result).toBeNull();
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(registrationService.getMine()).rejects.toThrow(/went wrong/i);
  });
});
