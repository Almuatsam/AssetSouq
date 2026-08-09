import { beforeEach, describe, expect, it } from "vitest";

import type { AuthSession } from "@/types/auth";
import { clearStoredSession, getStoredSession, setStoredSession } from "@/utils/authStorage";

const session: AuthSession = {
  token: "fake-token",
  user: { role: "EMPLOYEE", employee: { id: 1, staffNumber: "S1", name: "Jane", department: "IT", email: "j@x.com", active: true } },
};

describe("authStorage", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when nothing is stored", () => {
    // Act / Assert
    expect(getStoredSession()).toBeNull();
  });

  it("round-trips a session through set/get", () => {
    // Act
    setStoredSession(session);

    // Assert
    expect(getStoredSession()).toEqual(session);
  });

  it("returns null after clearing", () => {
    // Arrange
    setStoredSession(session);

    // Act
    clearStoredSession();

    // Assert
    expect(getStoredSession()).toBeNull();
  });

  it("treats corrupt stored data as logged out instead of throwing", () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", "{not valid json");

    // Act / Assert
    expect(() => getStoredSession()).not.toThrow();
    expect(getStoredSession()).toBeNull();
  });
});
