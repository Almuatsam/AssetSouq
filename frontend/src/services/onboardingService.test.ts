import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { onboardingService } from "@/services/onboardingService";
import type { OnboardingProgress } from "@/types/onboarding";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = apiClient.patch as unknown as ReturnType<typeof vi.fn>;

const baseProgress: OnboardingProgress = {
  status: "not_started",
  currentStepId: null,
  tourVersion: null,
  whatsNewSeenVersion: null,
  checklist: { dismissed: false, items: {} },
};

describe("onboardingService.getMine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the current progress", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { progress: baseProgress } } });

    // Act
    const result = await onboardingService.getMine();

    // Assert
    expect(result).toEqual(baseProgress);
    expect(mockedGet).toHaveBeenCalledWith("/onboarding/me");
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(onboardingService.getMine()).rejects.toThrow(/went wrong/i);
  });
});

describe("onboardingService.updateMine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the patch and returns the updated progress", async () => {
    // Arrange
    const updated = { ...baseProgress, status: "in_progress" as const };
    mockedPatch.mockResolvedValue({ data: { success: true, data: { progress: updated } } });

    // Act
    const result = await onboardingService.updateMine({ action: "start" });

    // Assert
    expect(result).toEqual(updated);
    expect(mockedPatch).toHaveBeenCalledWith("/onboarding/me", { action: "start" });
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedPatch.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(onboardingService.updateMine({ action: "skip" })).rejects.toThrow(/went wrong/i);
  });
});
