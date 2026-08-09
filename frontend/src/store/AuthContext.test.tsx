import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthProvider, useAuth } from "@/store/AuthContext";
import type { AuthSession } from "@/types/auth";
import { getStoredSession } from "@/utils/authStorage";

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

const session: AuthSession = {
  token: "tok",
  user: { role: "ADMIN", admin: { id: 1, username: "admin1", lastLogin: null } },
};

describe("useAuth", () => {
  beforeEach(() => localStorage.clear());

  it("throws when used outside an AuthProvider", () => {
    // Act / Assert — renderHook without the wrapper.
    expect(() => renderHook(() => useAuth())).toThrow(/within an AuthProvider/);
  });

  it("starts with no session when nothing is stored", () => {
    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    expect(result.current.session).toBeNull();
  });

  it("restores a previously stored session on mount", () => {
    // Arrange
    localStorage.setItem("assetsouq.auth", JSON.stringify(session));

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    expect(result.current.session).toEqual(session);
  });

  it("login() persists the session and updates state", () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Act
    act(() => result.current.login(session));

    // Assert
    expect(result.current.session).toEqual(session);
    expect(getStoredSession()).toEqual(session);
  });

  it("logout() clears the session and storage", () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login(session));

    // Act
    act(() => result.current.logout());

    // Assert
    expect(result.current.session).toBeNull();
    expect(getStoredSession()).toBeNull();
  });
});
