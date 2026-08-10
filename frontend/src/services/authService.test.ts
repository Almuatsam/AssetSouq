import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { authService } from "@/services/authService";

vi.mock("@/services/apiClient", () => ({
  apiClient: { post: vi.fn() },
}));

const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;

function axiosErrorWith(data: unknown, code?: string): AxiosError {
  return new AxiosError("Request failed", code, undefined, undefined, {
    data,
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe("authService.loginEmployee", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an EMPLOYEE session on success", async () => {
    // Arrange
    mockedPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          token: "tok",
          employee: { id: 1, staffNumber: "S1", name: "Jane", department: "IT", email: "j@x.com", active: true },
        },
      },
    });

    // Act
    const session = await authService.loginEmployee("S1");

    // Assert
    expect(session.token).toBe("tok");
    expect(session.user).toMatchObject({ role: "EMPLOYEE", employee: { staffNumber: "S1" } });
    expect(mockedPost).toHaveBeenCalledWith("/auth/employee/login", { staffNumber: "S1" });
  });

  // Error-normalization branches (network failure, generic error, etc.)
  // are covered exhaustively in services/apiError.test.ts — this just
  // confirms loginEmployee actually routes its rejection through that
  // shared helper.
  it("surfaces the backend's error message", async () => {
    // Arrange
    mockedPost.mockRejectedValue(axiosErrorWith({ success: false, error: "Invalid staff ID" }));

    // Act / Assert
    await expect(authService.loginEmployee("nope")).rejects.toThrow("Invalid staff ID");
  });
});

describe("authService.loginAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an ADMIN session on success", async () => {
    // Arrange
    mockedPost.mockResolvedValue({
      data: {
        success: true,
        data: { token: "admin-tok", admin: { id: 1, username: "admin1", lastLogin: null } },
      },
    });

    // Act
    const session = await authService.loginAdmin("admin1", "correct-password");

    // Assert
    expect(session.token).toBe("admin-tok");
    expect(session.user).toMatchObject({ role: "ADMIN", admin: { username: "admin1" } });
    expect(mockedPost).toHaveBeenCalledWith("/auth/admin/login", {
      username: "admin1",
      password: "correct-password",
    });
  });

  it("surfaces the backend's error message", async () => {
    // Arrange
    mockedPost.mockRejectedValue(
      axiosErrorWith({ success: false, error: "Invalid username or password" }),
    );

    // Act / Assert
    await expect(authService.loginAdmin("admin1", "wrong")).rejects.toThrow(
      "Invalid username or password",
    );
  });
});
