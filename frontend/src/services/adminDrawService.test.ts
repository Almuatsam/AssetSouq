import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { adminDrawService } from "@/services/adminDrawService";
import type { Draw } from "@/types/winner";

vi.mock("@/services/apiClient", () => ({
  apiClient: { post: vi.fn() },
}));

const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;

function axiosErrorWith(data: unknown): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    data,
    status: 409,
    statusText: "Conflict",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

const baseDraw: Draw = {
  id: 100,
  deviceId: 1,
  rngSeed: "seed",
  candidatePoolSnapshot: [10, 11],
  drawnAt: "2026-01-01T00:00:00.000Z",
  drawnByAdminId: 1,
  winners: [
    {
      id: 1,
      employeeId: 10,
      deviceId: 1,
      drawId: 100,
      priceDue: "150.00",
      paymentStatus: "PENDING",
      employee: { id: 10, staffNumber: "S1001", name: "Jane Doe", department: "Engineering" },
    },
  ],
};

describe("adminDrawService.run", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs the draw and returns it", async () => {
    // Arrange
    mockedPost.mockResolvedValue({ data: { success: true, data: { draw: baseDraw } } });

    // Act
    const result = await adminDrawService.run(1);

    // Assert
    expect(result).toEqual(baseDraw);
    expect(mockedPost).toHaveBeenCalledWith("/admin/draws", { deviceId: 1 });
  });

  it("surfaces the backend's error (e.g. no eligible candidates)", async () => {
    // Arrange
    mockedPost.mockRejectedValue(
      axiosErrorWith({ success: false, error: "No eligible candidates to draw from" }),
    );

    // Act / Assert
    await expect(adminDrawService.run(1)).rejects.toThrow(/no eligible candidates/i);
  });

  it("normalizes an unrecognized failure into a user-facing error", async () => {
    // Arrange
    mockedPost.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminDrawService.run(1)).rejects.toThrow(/went wrong/i);
  });
});
