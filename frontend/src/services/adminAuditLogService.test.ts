import { beforeEach, describe, expect, it, vi } from "vitest";

import { adminAuditLogService } from "@/services/adminAuditLogService";
import { apiClient } from "@/services/apiClient";
import type { AuditLog } from "@/types/auditLog";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

const baseLog: AuditLog = {
  id: 1,
  adminId: 1,
  action: "REDRAW_WINNER",
  entity: "Winner",
  entityId: 5,
  timestamp: "2026-01-01T00:00:00.000Z",
  admin: { id: 1, username: "admin1" },
};

describe("adminAuditLogService.listAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists every audit log entry with no filter by default", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { auditLogs: [baseLog] } } });

    // Act
    const result = await adminAuditLogService.listAll();

    // Assert
    expect(result).toEqual([baseLog]);
    expect(mockedGet).toHaveBeenCalledWith("/admin/audit-logs", { params: undefined });
  });

  it("passes filters as query params", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { auditLogs: [] } } });

    // Act
    await adminAuditLogService.listAll({ entity: "Winner", adminId: 1 });

    // Assert
    expect(mockedGet).toHaveBeenCalledWith("/admin/audit-logs", {
      params: { entity: "Winner", adminId: 1 },
    });
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminAuditLogService.listAll()).rejects.toThrow(/went wrong/i);
  });
});
