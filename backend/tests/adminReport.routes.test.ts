import request from "supertest";

import { createApp } from "../src/app";
import { reportService } from "../src/services/reportService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/reportService");

const mockedReportService = reportService as jest.Mocked<typeof reportService>;

const app = createApp();

const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });
const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe.each([
  ["devices", "buildDevicesReport", "devices-report.xlsx"],
  ["employees", "buildEmployeesReport", "employees-report.xlsx"],
  ["registrations", "buildRegistrationsReport", "registrations-report.xlsx"],
  ["winners", "buildWinnersReport", "winners-report.xlsx"],
] as const)("GET /api/admin/reports/%s", (path, serviceMethod, filename) => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get(`/api/admin/reports/${path}`);

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees", async () => {
    // Act
    const res = await request(app)
      .get(`/api/admin/reports/${path}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(403);
  });

  it("returns the workbook as an xlsx attachment for an authenticated admin", async () => {
    // Arrange
    mockedReportService[serviceMethod].mockResolvedValue(Buffer.from("fake-xlsx-bytes"));

    // Act
    const res = await request(app)
      .get(`/api/admin/reports/${path}`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe(XLSX_CONTENT_TYPE);
    expect(res.headers["content-disposition"]).toBe(`attachment; filename="${filename}"`);
    expect(mockedReportService[serviceMethod]).toHaveBeenCalled();
  });

  it("propagates a report-generation failure through the error handler", async () => {
    // Arrange
    mockedReportService[serviceMethod].mockRejectedValue(new Error("boom"));

    // Act
    const res = await request(app)
      .get(`/api/admin/reports/${path}`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(500);
  });
});
