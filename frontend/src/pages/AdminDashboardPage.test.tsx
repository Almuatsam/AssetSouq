import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import AdminDashboardPage from "@/pages/AdminDashboardPage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { getStoredSession, setStoredSession } from "@/utils/authStorage";

describe("AdminDashboardPage", () => {
  beforeEach(() => localStorage.clear());

  it("greets the logged-in admin by username", () => {
    // Arrange
    setStoredSession({
      token: "tok",
      user: { role: "ADMIN", admin: { id: 1, username: "admin1", lastLogin: null } },
    });

    // Act
    renderWithProviders(<AdminDashboardPage />);

    // Assert
    expect(screen.getByRole("heading", { name: /admin1/i })).toBeInTheDocument();
  });

  it("logs out and clears the stored session when the logout button is clicked", async () => {
    // Arrange
    setStoredSession({
      token: "tok",
      user: { role: "ADMIN", admin: { id: 1, username: "admin1", lastLogin: null } },
    });
    const user = userEvent.setup();
    renderWithProviders(<AdminDashboardPage />);

    // Act
    await user.click(screen.getByRole("button", { name: /log out/i }));

    // Assert
    expect(getStoredSession()).toBeNull();
  });
});
