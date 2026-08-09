import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import DevicesPage from "@/pages/DevicesPage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { getStoredSession, setStoredSession } from "@/utils/authStorage";

describe("DevicesPage", () => {
  beforeEach(() => localStorage.clear());

  it("greets the logged-in employee by name", () => {
    // Arrange
    setStoredSession({
      token: "tok",
      user: {
        role: "EMPLOYEE",
        employee: { id: 1, staffNumber: "S1", name: "Jane", department: "IT", email: "j@x.com", active: true },
      },
    });

    // Act
    renderWithProviders(<DevicesPage />);

    // Assert
    expect(screen.getByRole("heading", { name: /jane/i })).toBeInTheDocument();
  });

  it("logs out and clears the stored session when the logout button is clicked", async () => {
    // Arrange
    setStoredSession({
      token: "tok",
      user: {
        role: "EMPLOYEE",
        employee: { id: 1, staffNumber: "S1", name: "Jane", department: "IT", email: "j@x.com", active: true },
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<DevicesPage />);

    // Act
    await user.click(screen.getByRole("button", { name: /log out/i }));

    // Assert
    expect(getStoredSession()).toBeNull();
  });
});
