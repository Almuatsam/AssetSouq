import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminAuditLogPage from "@/pages/AdminAuditLogPage";
import { adminAuditLogService } from "@/services/adminAuditLogService";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { AuditLog } from "@/types/auditLog";
import { setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/adminAuditLogService");

const mockedAdminAuditLogService = adminAuditLogService as unknown as { listAll: ReturnType<typeof vi.fn> };

const adminSession = {
  token: "tok",
  user: { role: "ADMIN" as const, admin: { id: 1, username: "admin1", lastLogin: null } },
};

const baseLog: AuditLog = {
  id: 1,
  adminId: 1,
  action: "REDRAW_WINNER",
  entity: "Winner",
  entityId: 5,
  timestamp: "2026-01-01T00:00:00.000Z",
  admin: { id: 1, username: "admin1" },
};

describe("AdminAuditLogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setStoredSession(adminSession);
    mockedAdminAuditLogService.listAll.mockResolvedValue([]);
  });

  it("lists audit log entries with admin, action, entity, and entity id", async () => {
    // Arrange
    mockedAdminAuditLogService.listAll.mockResolvedValue([baseLog]);

    // Act
    renderWithProviders(<AdminAuditLogPage />);

    // Assert
    expect(await screen.findByText("admin1")).toBeInTheDocument();
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("REDRAW_WINNER")).toBeInTheDocument();
    expect(within(row).getByText("Winner")).toBeInTheDocument();
    expect(within(row).getByText("5")).toBeInTheDocument();
  });

  it("falls back to a placeholder when the acting admin is unknown", async () => {
    // Arrange
    mockedAdminAuditLogService.listAll.mockResolvedValue([{ ...baseLog, adminId: null, admin: null }]);

    // Act
    renderWithProviders(<AdminAuditLogPage />);

    // Assert
    expect(await screen.findByText(/unknown/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no audit log entries", async () => {
    // Act
    renderWithProviders(<AdminAuditLogPage />);

    // Assert
    expect(await screen.findByText(/no audit log/i)).toBeInTheDocument();
  });

  it("shows an error message when the list fails to load", async () => {
    // Arrange
    mockedAdminAuditLogService.listAll.mockRejectedValue(new Error("network down"));

    // Act
    renderWithProviders(<AdminAuditLogPage />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load/i);
  });

  it("re-queries with an entity filter when one is entered", async () => {
    // Arrange
    mockedAdminAuditLogService.listAll.mockResolvedValue([baseLog]);
    const user = userEvent.setup();
    renderWithProviders(<AdminAuditLogPage />);
    await screen.findByText("admin1");

    // Act
    await user.type(screen.getByLabelText(/filter/i), "Winner");

    // Assert
    await waitFor(() =>
      expect(mockedAdminAuditLogService.listAll).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Winner" }),
      ),
    );
  });
});
