import request from "supertest";

import { createApp } from "../src/app";
import { winnerService } from "../src/services/winnerService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/winnerService");

const mockedWinnerService = winnerService as jest.Mocked<typeof winnerService>;

const app = createApp();

const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });
const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

const baseWinner = {
  id: 1,
  employeeId: 10,
  deviceId: 1,
  drawId: 100,
  drawDate: new Date(),
  accepted: false,
  priceDue: "150.00",
  paymentStatus: "PENDING",
  paymentDate: null,
  paymentMethod: null,
  handoverDate: null,
  redrawOf: null,
  redrawReason: null,
  employee: { id: 10, staffNumber: "S1001", name: "Jane Doe", department: "Engineering" },
  device: {
    id: 1,
    assetTag: "AST-001",
    deviceType: "Laptop",
    brand: "Dell",
    model: "Latitude 5420",
    price: "150.00",
    status: "DRAWN",
  },
};

describe("GET /api/admin/winners", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/admin/winners");

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees (admin-only route)", async () => {
    // Act
    const res = await request(app).get("/api/admin/winners").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(403);
  });

  it("returns every winner for an authenticated admin", async () => {
    // Arrange
    mockedWinnerService.listAllForAdmin.mockResolvedValue([baseWinner] as never);

    // Act
    const res = await request(app).get("/api/admin/winners").set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.winners).toHaveLength(1);
    expect(mockedWinnerService.listAllForAdmin).toHaveBeenCalledWith({});
  });

  it("passes filters through to the service", async () => {
    // Arrange
    mockedWinnerService.listAllForAdmin.mockResolvedValue([]);

    // Act
    const res = await request(app)
      .get("/api/admin/winners?paymentStatus=PAID&deviceId=1")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(mockedWinnerService.listAllForAdmin).toHaveBeenCalledWith({ paymentStatus: "PAID", deviceId: 1 });
  });

  it("returns 400 for an invalid paymentStatus filter", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/winners?paymentStatus=NOT_A_STATUS")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(400);
    expect(mockedWinnerService.listAllForAdmin).not.toHaveBeenCalled();
  });
});
