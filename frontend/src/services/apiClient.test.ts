import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { clearStoredSession, getStoredSession, setStoredSession } from "@/utils/authStorage";

function unauthorizedError(url: string): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", { url, headers: new AxiosHeaders() }, undefined, {
    data: { success: false, error: "Invalid or expired token" },
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config: { url, headers: new AxiosHeaders() },
  });
}

async function runResponseErrorInterceptor(error: unknown) {
  const handlers = (
    apiClient.interceptors.response as unknown as {
      handlers: Array<{ rejected: (e: unknown) => unknown }>;
    }
  ).handlers;
  return handlers[0].rejected(error);
}

describe("apiClient request interceptor", () => {
  beforeEach(() => localStorage.clear());

  // axios stores registered interceptors on a private `handlers` array —
  // there's no public API to invoke just the callback, so reach in here.
  async function runInterceptor(config: { headers: Record<string, unknown> }) {
    const handlers = (
      apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (c: typeof config) => typeof config }>;
      }
    ).handlers;
    return handlers[0].fulfilled(config);
  }

  it("attaches the Authorization header when a session is stored", async () => {
    // Arrange
    setStoredSession({
      token: "tok",
      user: { role: "ADMIN", admin: { id: 1, username: "admin1", lastLogin: null } },
    });

    // Act
    const config = await runInterceptor({ headers: {} });

    // Assert
    expect(config.headers.Authorization).toBe("Bearer tok");
  });

  it("does not set an Authorization header when there is no session", async () => {
    // Arrange
    clearStoredSession();

    // Act
    const config = await runInterceptor({ headers: {} });

    // Assert
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe("apiClient response interceptor", () => {
  const originalAssign = window.location.assign;

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign: vi.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { value: { ...window.location, assign: originalAssign }, writable: true });
  });

  it("clears the session and redirects on a 401 from an authenticated request", async () => {
    // Arrange
    setStoredSession({
      token: "tok",
      user: { role: "ADMIN", admin: { id: 1, username: "admin1", lastLogin: null } },
    });

    // Act
    await expect(runResponseErrorInterceptor(unauthorizedError("/devices"))).rejects.toBeTruthy();

    // Assert
    expect(getStoredSession()).toBeNull();
    expect(window.location.assign).toHaveBeenCalledWith("/");
  });

  it("does NOT clear the session or redirect on a 401 from the login endpoints themselves", async () => {
    // Arrange — the login forms handle their own 401s inline (invalid
    // staff ID / invalid credentials); this must not also trigger a
    // hard redirect out from under the form.
    setStoredSession({
      token: "stale-but-irrelevant",
      user: { role: "EMPLOYEE", employee: { id: 1, staffNumber: "S1", name: "Jane", department: "IT", email: "j@x.com", active: true } },
    });

    // Act
    await expect(
      runResponseErrorInterceptor(unauthorizedError("/auth/employee/login")),
    ).rejects.toBeTruthy();
    await expect(
      runResponseErrorInterceptor(unauthorizedError("/auth/admin/login")),
    ).rejects.toBeTruthy();

    // Assert
    expect(getStoredSession()).not.toBeNull();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("passes through non-401 errors without touching the session", async () => {
    // Arrange
    setStoredSession({
      token: "tok",
      user: { role: "ADMIN", admin: { id: 1, username: "admin1", lastLogin: null } },
    });
    const serverError = new AxiosError("boom", "ERR_BAD_RESPONSE", undefined, undefined, {
      data: {},
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      config: { headers: new AxiosHeaders() },
    });

    // Act
    await expect(runResponseErrorInterceptor(serverError)).rejects.toBe(serverError);

    // Assert
    expect(getStoredSession()).not.toBeNull();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
