import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminDashboardPage from "@/pages/AdminDashboardPage";
import { dashboardService } from "@/services/dashboardService";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { DashboardStats } from "@/types/dashboard";
import { getStoredSession, setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/dashboardService");

const mockedDashboardService = dashboardService as unknown as { getStats: ReturnType<typeof vi.fn> };

const adminSession = {
  token: "tok",
  user: { role: "ADMIN" as const, admin: { id: 1, username: "admin1", lastLogin: null, credentialsChangedAt: null } },
};

const baseStats: DashboardStats = {
  devices: { AVAILABLE: 7, REMOVED: 2, DRAWN: 1, SOLD: 0, total: 10 },
  employees: { total: 20, active: 18, eligible: 12 },
  registrations: { PENDING: 0, ELIGIBLE: 5, INELIGIBLE: 1, WITHDRAWN: 2, total: 8 },
};

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    setStoredSession(adminSession);
    mockedDashboardService.getStats.mockResolvedValue(baseStats);
  });

  it("greets the logged-in admin by username", () => {
    // Act
    renderWithProviders(<AdminDashboardPage />);

    // Assert
    expect(screen.getByRole("heading", { name: /admin1/i })).toBeInTheDocument();
  });

  it("logs out and clears the stored session when the logout button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<AdminDashboardPage />);

    // Act
    await user.click(screen.getByRole("button", { name: /log out/i }));

    // Assert
    expect(getStoredSession()).toBeNull();
  });

  it("links to the device management page", () => {
    // Act
    renderWithProviders(<AdminDashboardPage />);

    // Assert
    expect(screen.getByRole("link", { name: /manage devices/i })).toHaveAttribute(
      "href",
      "/admin/devices",
    );
  });

  it("links to the employee management page", () => {
    // Act
    renderWithProviders(<AdminDashboardPage />);

    // Assert
    expect(screen.getByRole("link", { name: /manage employees/i })).toHaveAttribute(
      "href",
      "/admin/employees",
    );
  });

  it("links to the registration management page", () => {
    // Act
    renderWithProviders(<AdminDashboardPage />);

    // Assert
    expect(screen.getByRole("link", { name: /manage registrations/i })).toHaveAttribute(
      "href",
      "/admin/registrations",
    );
  });

  it("links to the winners page", () => {
    // Act
    renderWithProviders(<AdminDashboardPage />);

    // Assert
    expect(screen.getByRole("link", { name: /view winners/i })).toHaveAttribute("href", "/admin/winners");
  });

  it("shows the total counts once stats load", async () => {
    // Act
    renderWithProviders(<AdminDashboardPage />);
    await screen.findByText("Total Devices");

    // Assert — scoped to each card, since recharts' own axis ticks can
    // render the same bare digits (e.g. a Y-axis tick of "8") elsewhere
    // on the page.
    const devicesCard = screen.getByText("Total Devices").closest("div")!;
    expect(within(devicesCard).getByText("10")).toBeInTheDocument();

    const employeesCard = screen.getByText("Total Employees").closest("div")!;
    expect(within(employeesCard).getByText("20")).toBeInTheDocument();
    expect(within(employeesCard).getByText("18 active, 12 eligible")).toBeInTheDocument();

    const registrationsCard = screen.getByText("Total Registrations").closest("div")!;
    expect(within(registrationsCard).getByText("8")).toBeInTheDocument();
  });

  it("renders a bar for every device and registration status, including zero counts", async () => {
    // Act
    renderWithProviders(<AdminDashboardPage />);
    await screen.findByText("Total Devices");

    // Assert — recharts renders each category's axis tick as a real SVG
    // <tspan>, including SOLD (0 devices) and PENDING (0 registrations),
    // confirming every status is wired into the chart data, not just the
    // ones with a nonzero count. Scoped to `tspan` because recharts also
    // renders a hidden `#recharts_measurement_span` with the same text,
    // used internally to measure label width.
    expect(screen.getByText("Available", { selector: "tspan" })).toBeInTheDocument();
    expect(screen.getByText("Sold", { selector: "tspan" })).toBeInTheDocument();
    expect(screen.getByText("Pending", { selector: "tspan" })).toBeInTheDocument();
    expect(screen.getByText("Withdrawn", { selector: "tspan" })).toBeInTheDocument();
  });

  it("shows an error message when stats fail to load", async () => {
    // Arrange
    mockedDashboardService.getStats.mockRejectedValue(new Error("network down"));

    // Act
    renderWithProviders(<AdminDashboardPage />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load dashboard stats/i);
  });

  describe("one-time admin credential setup", () => {
    it("auto-opens the setup modal for an admin still on the default credentials", () => {
      // Act
      renderWithProviders(<AdminDashboardPage />);

      // Assert — the dashboard reminder card ("Admin Account Setup") and
      // the modal's own title ("Complete Admin Account Setup") are both
      // on screen at once, so assert on the modal's specific title.
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /complete admin account setup/i })).toBeInTheDocument();
    });

    it("closes the modal without touching the stored session when dismissed", async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(<AdminDashboardPage />);

      // Act
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));

      // Assert
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(getStoredSession()).not.toBeNull();
    });

    it("keeps the reminder card visible after the modal is dismissed", async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(<AdminDashboardPage />);

      // Act
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));

      // Assert
      expect(
        screen.getByRole("heading", { name: /^admin account setup$/i, level: 2 }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /change admin credentials/i }),
      ).toBeInTheDocument();
    });

    it("does not reopen automatically after a remount within the same browser session, once dismissed", async () => {
      // Arrange — React Router unmounts/remounts this page on every
      // navigation away and back to /admin/dashboard; a plain per-mount
      // "haven't shown it yet" flag would reopen the modal on every single
      // such revisit, which is exactly what this test guards against.
      const user = userEvent.setup();
      const { unmount } = renderWithProviders(<AdminDashboardPage />);
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));
      unmount();

      // Act — simulates navigating back to the dashboard.
      renderWithProviders(<AdminDashboardPage />);

      // Assert
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /^admin account setup$/i, level: 2 }),
      ).toBeInTheDocument();
    });

    it("reopens the modal from the reminder card's button", async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(<AdminDashboardPage />);
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Act
      await user.click(screen.getByRole("button", { name: /change admin credentials/i }));

      // Assert
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("does not auto-open the modal, and shows the completed state instead, once the handover is done", () => {
      // Arrange
      setStoredSession({
        ...adminSession,
        user: {
          role: "ADMIN",
          admin: { id: 1, username: "company_admin", lastLogin: null, credentialsChangedAt: "2026-01-01T00:00:00.000Z" },
        },
      });

      // Act
      renderWithProviders(<AdminDashboardPage />);

      // Assert
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /account security/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /change admin credentials/i })).not.toBeInTheDocument();
    });
  });
});
