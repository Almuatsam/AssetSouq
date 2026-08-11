import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { adminWinnerService } from "@/services/adminWinnerService";
import type { Winner } from "@/types/winner";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

const baseWinner: Winner = {
  id: 1,
  employeeId: 10,
  deviceId: 1,
  drawId: 100,
  drawDate: "2026-01-01T00:00:00.000Z",
  accepted: false,
  priceDue: "150.00",
  paymentStatus: "PENDING",
  paymentDate: null,
  paymentMethod: null,
  handoverDate: null,
  redrawOf: null,
  redrawReason: null,
  employee: { id: 10, staffNumber: "S1001", name: "Jane Doe", department: "Engineering" },
  device: {
    id: 1,
    assetTag: "AST-001",
    deviceType: "Laptop",
    brand: "Dell",
    model: "Latitude 5420",
    price: "150.00",
    status: "DRAWN",
  },
};

describe("adminWinnerService.listAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists every winner with no filter by default", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { winners: [baseWinner] } } });

    // Act
    const result = await adminWinnerService.listAll();

    // Assert
    expect(result).toEqual([baseWinner]);
    expect(mockedGet).toHaveBeenCalledWith("/admin/winners", { params: undefined });
  });

  it("passes filters as query params", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { winners: [] } } });

    // Act
    await adminWinnerService.listAll({ paymentStatus: "PAID" });

    // Assert
    expect(mockedGet).toHaveBeenCalledWith("/admin/winners", { params: { paymentStatus: "PAID" } });
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminWinnerService.listAll()).rejects.toThrow(/went wrong/i);
  });
});
