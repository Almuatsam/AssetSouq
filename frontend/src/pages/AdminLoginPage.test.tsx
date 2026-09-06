import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminLoginPage from "@/pages/AdminLoginPage";
import { authService } from "@/services/authService";
import { AuthProvider } from "@/store/AuthContext";
import i18n from "@/utils/i18n";

vi.mock("@/services/authService", () => ({
  authService: { loginEmployee: vi.fn(), loginAdmin: vi.fn() },
}));

const mockedLoginAdmin = authService.loginAdmin as unknown as ReturnType<typeof vi.fn>;

function renderPage({ state }: { state?: unknown } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <MemoryRouter initialEntries={[{ pathname: "/admin/login", state }]}>
            <Routes>
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/dashboard" element={<div>ADMIN_DASHBOARD</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("AdminLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows validation errors and does not call the service when submitted empty", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage();

    // Act
    await user.click(screen.getByRole("button", { name: /log in/i }));

    // Assert
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockedLoginAdmin).not.toHaveBeenCalled();
  });

  it("logs in and navigates to /admin/dashboard on success", async () => {
    // Arrange
    mockedLoginAdmin.mockResolvedValue({
      token: "admin-tok",
      user: { role: "ADMIN", admin: { id: 1, username: "admin1", lastLogin: null, credentialsChangedAt: null } },
    });
    const user = userEvent.setup();
    renderPage();

    // Act
    await user.type(screen.getByLabelText(/username/i), "admin1");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    // Assert
    expect(await screen.findByText("ADMIN_DASHBOARD")).toBeInTheDocument();
    expect(mockedLoginAdmin).toHaveBeenCalledWith("admin1", "correct-password");
  });

  it("shows the server's error message and stays on the page when login is rejected", async () => {
    // Arrange
    mockedLoginAdmin.mockRejectedValue(new Error("Invalid username or password"));
    const user = userEvent.setup();
    renderPage();

    // Act
    await user.type(screen.getByLabelText(/username/i), "admin1");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
    await waitFor(() => expect(screen.queryByText("ADMIN_DASHBOARD")).not.toBeInTheDocument());
  });

  it("shows the credential-change success banner when navigated here with that state", () => {
    // Act — as AdminCredentialsSetupModal's navigate() call does after a
    // successful one-time credential change.
    renderPage({ state: { credentialsChangedSuccess: true } });

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent(/updated.*log in with your new credentials/i);
  });

  it("does not show the success banner on a normal visit to the login page", () => {
    // Act
    renderPage();

    // Assert
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
