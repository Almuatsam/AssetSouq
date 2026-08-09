import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { renderWithProviders } from "@/test/renderWithProviders";
import { setStoredSession } from "@/utils/authStorage";

function Guarded() {
  return (
    <Routes>
      <Route
        path="/devices"
        element={
          <ProtectedRoute requiredRole="EMPLOYEE" redirectTo="/login">
            <div>DEVICES_PAGE</div>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<div>LOGIN_PAGE</div>} />
    </Routes>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => localStorage.clear());

  it("redirects to redirectTo when there is no session", () => {
    // Act
    renderWithProviders(<Guarded />, { route: "/devices" });

    // Assert
    expect(screen.getByText("LOGIN_PAGE")).toBeInTheDocument();
  });

  it("redirects when the session's role doesn't match", () => {
    // Arrange
    setStoredSession({
      token: "tok",
      user: { role: "ADMIN", admin: { id: 1, username: "admin1", lastLogin: null } },
    });

    // Act
    renderWithProviders(<Guarded />, { route: "/devices" });

    // Assert
    expect(screen.getByText("LOGIN_PAGE")).toBeInTheDocument();
  });

  it("renders the protected content when the role matches", () => {
    // Arrange — AuthProvider inside renderWithProviders reads storage at
    // mount, so seed it before rendering.
    setStoredSession({
      token: "tok",
      user: {
        role: "EMPLOYEE",
        employee: { id: 1, staffNumber: "S1", name: "Jane", department: "IT", email: "j@x.com", active: true },
      },
    });

    // Act
    renderWithProviders(<Guarded />, { route: "/devices" });

    // Assert
    expect(screen.getByText("DEVICES_PAGE")).toBeInTheDocument();
  });
});
