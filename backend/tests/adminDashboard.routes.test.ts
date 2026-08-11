import request from "supertest";

import { createApp } from "../src/app";
import { dashboardService } from "../src/services/dashboardService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/dashboardService");

const mockedDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;

const app = createApp();

const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });
const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

const baseStats = {
  devices: { AVAILABLE: 7, REMOVED: 2, DRAWN: 1, SOLD: 0, total: 10 },
  employees: { total: 20, active: 18, eligible: 12 },
  registrations: { PENDING: 0, ELIGIBLE: 5, INELIGIBLE: 1, WITHDRAWN: 2, total: 8 },
};

describe("GET /api/admin/dashboard/stats", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/admin/dashboard/stats");

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees (admin-only route)", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/dashboard/stats")
      .set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(403);
  });

  it("returns the aggregated stats for an authenticated admin", async () => {
    // Arrange
    mockedDashboardService.getStats.mockResolvedValue(baseStats);

    // Act
    const res = await request(app)
      .get("/api/admin/dashboard/stats")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.stats).toEqual(baseStats);
  });
});
