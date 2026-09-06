import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { adminAccountService } from "@/services/adminAccountService";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

const mockedPatch = apiClient.patch as unknown as ReturnType<typeof vi.fn>;

const input = {
  newUsername: "company_admin",
  newPassword: "CompanyPass123",
  confirmPassword: "CompanyPass123",
};

describe("adminAccountService.changeCredentials", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCHes the credentials endpoint and returns the updated admin", async () => {
    // Arrange
    const updatedAdmin = {
      id: 1,
      username: "company_admin",
      lastLogin: null,
      credentialsChangedAt: "2026-01-01T00:00:00.000Z",
    };
    mockedPatch.mockResolvedValue({ data: { success: true, data: { admin: updatedAdmin } } });

    // Act
    const result = await adminAccountService.changeCredentials(input);

    // Assert
    expect(result).toEqual(updatedAdmin);
    expect(mockedPatch).toHaveBeenCalledWith("/admin/account/credentials", input);
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedPatch.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminAccountService.changeCredentials(input)).rejects.toThrow(/went wrong/i);
  });
});
