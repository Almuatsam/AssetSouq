import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminReportsPage from "@/pages/AdminReportsPage";
import { adminReportService } from "@/services/adminReportService";
import { renderWithProviders } from "@/test/renderWithProviders";
import { setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/adminReportService");

const mockedAdminReportService = adminReportService as unknown as { download: ReturnType<typeof vi.fn> };

const adminSession = {
  token: "tok",
  user: { role: "ADMIN" as const, admin: { id: 1, username: "admin1", lastLogin: null } },
};

describe("AdminReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setStoredSession(adminSession);
    mockedAdminReportService.download.mockResolvedValue(undefined);
  });

  it("renders a download button for every report type", () => {
    // Act
    renderWithProviders(<AdminReportsPage />);

    // Assert
    expect(screen.getAllByRole("button", { name: /download/i })).toHaveLength(4);
  });

  it("gives each download button a distinct accessible name", () => {
    // Act
    renderWithProviders(<AdminReportsPage />);

    // Assert — a screen reader must be able to tell the four buttons
    // apart; four identical "Download" names would not do that.
    expect(screen.getByRole("button", { name: /devices report download/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /employees report download/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /registrations report download/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /winners report download/i })).toBeInTheDocument();
  });

  it("downloads the devices report when its button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<AdminReportsPage />);
    const devicesCard = screen.getByRole("heading", { name: /devices/i }).closest("div") as HTMLElement;

    // Act
    await user.click(within(devicesCard).getByRole("button", { name: /download/i }));

    // Assert
    expect(mockedAdminReportService.download).toHaveBeenCalledWith("devices");
  });

  it("shows an error message when a download fails", async () => {
    // Arrange
    mockedAdminReportService.download.mockRejectedValue(new Error("Too many requests."));
    const user = userEvent.setup();
    renderWithProviders(<AdminReportsPage />);
    const buttons = screen.getAllByRole("button", { name: /download/i });

    // Act
    await user.click(buttons[0]);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests.");
  });

  it("keeps each report's error message independent of the others", async () => {
    // Arrange — two different reports fail with two different messages;
    // neither should overwrite the other's.
    mockedAdminReportService.download.mockImplementation((reportType: string) =>
      Promise.reject(new Error(`${reportType} failed`)),
    );
    const user = userEvent.setup();
    renderWithProviders(<AdminReportsPage />);
    const buttons = screen.getAllByRole("button", { name: /download/i });

    // Act
    await user.click(buttons[0]);
    await user.click(buttons[1]);

    // Assert
    const alerts = await screen.findAllByRole("alert");
    const alertText = alerts.map((alert) => alert.textContent).join(" ");
    expect(alertText).toContain("devices failed");
    expect(alertText).toContain("employees failed");
  });

  it("disables only the button for the download currently in flight", async () => {
    // Arrange
    let resolveDownload!: () => void;
    mockedAdminReportService.download.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDownload = resolve;
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<AdminReportsPage />);
    const buttons = screen.getAllByRole("button", { name: /download/i });

    // Act
    await user.click(buttons[0]);

    // Assert
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
    expect(buttons[2]).toBeEnabled();
    expect(buttons[3]).toBeEnabled();

    // Cleanup
    resolveDownload();
  });
});
