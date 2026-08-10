import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { toUserFacingError } from "@/services/apiError";

function axiosErrorWith(data: unknown, code?: string): AxiosError {
  return new AxiosError("Request failed", code, undefined, undefined, {
    data,
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe("toUserFacingError", () => {
  it("surfaces the backend's structured error message", () => {
    // Act
    const result = toUserFacingError(axiosErrorWith({ success: false, error: "Invalid staff ID" }));

    // Assert
    expect(result.message).toBe("Invalid staff ID");
  });

  it("falls back to a connectivity message on a network error with no response body", () => {
    // Act
    const result = toUserFacingError(axiosErrorWith(undefined, "ERR_NETWORK"));

    // Assert
    expect(result.message).toMatch(/reach the server/i);
  });

  it("falls back to a generic message for a non-axios error", () => {
    // Act
    const result = toUserFacingError(new Error("boom"));

    // Assert
    expect(result.message).toMatch(/went wrong/i);
  });

  it("falls back to a generic message for a thrown non-Error value", () => {
    // Act
    const result = toUserFacingError("not even an Error object");

    // Assert
    expect(result.message).toMatch(/went wrong/i);
  });

  it("falls back to a generic message for an axios error with a response but no error field", () => {
    // Act
    const result = toUserFacingError(axiosErrorWith({ success: false }));

    // Assert
    expect(result.message).toMatch(/went wrong/i);
  });
});
