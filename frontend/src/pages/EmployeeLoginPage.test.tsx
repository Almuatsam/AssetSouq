import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EmployeeLoginPage from "@/pages/EmployeeLoginPage";
import { authService } from "@/services/authService";
import { AuthProvider } from "@/store/AuthContext";
import i18n from "@/utils/i18n";

vi.mock("@/services/authService", () => ({
  authService: { loginEmployee: vi.fn(), loginAdmin: vi.fn() },
}));

const mockedLoginEmployee = authService.loginEmployee as unknown as ReturnType<typeof vi.fn>;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/login"]}>
            <Routes>
              <Route path="/login" element={<EmployeeLoginPage />} />
              <Route path="/devices" element={<div>DEVICES_PAGE</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("EmployeeLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a validation error and does not call the service when submitted empty", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage();

    // Act
    await user.click(screen.getByRole("button", { name: /log in/i }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/staff id is required/i);
    expect(mockedLoginEmployee).not.toHaveBeenCalled();
  });

  it("logs in and navigates to /devices on success", async () => {
    // Arrange
    mockedLoginEmployee.mockResolvedValue({
      token: "tok",
      user: {
        role: "EMPLOYEE",
        employee: { id: 1, staffNumber: "S1001", name: "Jane", department: "IT", email: "j@x.com", active: true },
      },
    });
    const user = userEvent.setup();
    renderPage();

    // Act
    await user.type(screen.getByLabelText(/staff id/i), "S1001");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    // Assert
    expect(await screen.findByText("DEVICES_PAGE")).toBeInTheDocument();
    expect(mockedLoginEmployee).toHaveBeenCalledWith("S1001");
  });

  it("shows the server's error message and stays on the page when login is rejected", async () => {
    // Arrange
    mockedLoginEmployee.mockRejectedValue(new Error("Invalid staff ID"));
    const user = userEvent.setup();
    renderPage();

    // Act
    await user.type(screen.getByLabelText(/staff id/i), "UNKNOWN");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid staff ID");
    await waitFor(() => expect(screen.queryByText("DEVICES_PAGE")).not.toBeInTheDocument());
  });
});
