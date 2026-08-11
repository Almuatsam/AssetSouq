import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardStats } from "@/types/dashboard";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

const baseStats: DashboardStats = {
  devices: { AVAILABLE: 7, REMOVED: 2, DRAWN: 1, SOLD: 0, total: 10 },
  employees: { total: 20, active: 18, eligible: 12 },
  registrations: { PENDING: 0, ELIGIBLE: 5, INELIGIBLE: 1, WITHDRAWN: 2, total: 8 },
};

describe("dashboardService.getStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the aggregated stats", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { stats: baseStats } } });

    // Act
    const result = await dashboardService.getStats();

    // Assert
    expect(result).toEqual(baseStats);
    expect(mockedGet).toHaveBeenCalledWith("/admin/dashboard/stats");
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(dashboardService.getStats()).rejects.toThrow(/went wrong/i);
  });
});
