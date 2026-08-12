import request from "supertest";

import { createApp } from "../src/app";
import { auditLogService } from "../src/services/auditLogService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/auditLogService");

const mockedAuditLogService = auditLogService as jest.Mocked<typeof auditLogService>;

const app = createApp();

const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });
const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

const baseLog = {
  id: 1,
  adminId: 1,
  action: "REDRAW_WINNER",
  entity: "Winner",
  entityId: 5,
  timestamp: new Date(),
  admin: { id: 1, username: "admin1" },
};

describe("GET /api/admin/audit-logs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/admin/audit-logs");

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees (admin-only route)", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(403);
  });

  it("returns every audit log for an authenticated admin", async () => {
    // Arrange
    mockedAuditLogService.listAll.mockResolvedValue([baseLog] as never);

    // Act
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.auditLogs).toHaveLength(1);
    expect(mockedAuditLogService.listAll).toHaveBeenCalledWith({});
  });

  it("passes filters through to the service", async () => {
    // Arrange
    mockedAuditLogService.listAll.mockResolvedValue([]);

    // Act
    const res = await request(app)
      .get("/api/admin/audit-logs?entity=Winner&adminId=1")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(mockedAuditLogService.listAll).toHaveBeenCalledWith({ entity: "Winner", adminId: 1 });
  });

  it("returns 400 for an invalid adminId filter", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/audit-logs?adminId=not-a-number")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(400);
    expect(mockedAuditLogService.listAll).not.toHaveBeenCalled();
  });
});
