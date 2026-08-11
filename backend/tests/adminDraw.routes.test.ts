import request from "supertest";

import { createApp } from "../src/app";
import { AppError } from "../src/middlewares/errorHandler";
import { drawService } from "../src/services/drawService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/drawService");

const mockedDrawService = drawService as jest.Mocked<typeof drawService>;

const app = createApp();

const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });
const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

const baseDraw = {
  id: 100,
  deviceId: 1,
  rngSeed: "seed",
  candidatePoolSnapshot: [10, 11],
  drawnAt: new Date(),
  drawnByAdminId: 1,
  winners: [{ id: 1, employeeId: 10, deviceId: 1, drawId: 100, priceDue: "150.00", paymentStatus: "PENDING" }],
};

describe("POST /api/admin/draws", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).post("/api/admin/draws").send({ deviceId: 1 });

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees (admin-only route)", async () => {
    // Act
    const res = await request(app)
      .post("/api/admin/draws")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ deviceId: 1 });

    // Assert
    expect(res.status).toBe(403);
  });

  it("runs the draw and returns it for an authenticated admin", async () => {
    // Arrange
    mockedDrawService.runDraw.mockResolvedValue(baseDraw as never);

    // Act
    const res = await request(app)
      .post("/api/admin/draws")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ deviceId: 1 });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.data.draw.winners).toHaveLength(1);
    expect(mockedDrawService.runDraw).toHaveBeenCalledWith(1, 1);
  });

  it("returns 400 for a missing deviceId", async () => {
    // Act
    const res = await request(app)
      .post("/api/admin/draws")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    // Assert
    expect(res.status).toBe(400);
    expect(mockedDrawService.runDraw).not.toHaveBeenCalled();
  });

  it("returns 404 when the device doesn't exist", async () => {
    // Arrange
    mockedDrawService.runDraw.mockRejectedValue(new AppError(404, "Device not found"));

    // Act
    const res = await request(app)
      .post("/api/admin/draws")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ deviceId: 999 });

    // Assert
    expect(res.status).toBe(404);
  });

  it("returns 409 when the device isn't AVAILABLE", async () => {
    // Arrange
    mockedDrawService.runDraw.mockRejectedValue(
      new AppError(409, "Cannot run a draw for a device that is DRAWN, not AVAILABLE"),
    );

    // Act
    const res = await request(app)
      .post("/api/admin/draws")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ deviceId: 1 });

    // Assert
    expect(res.status).toBe(409);
  });

  it("returns 409 when there are no eligible candidates", async () => {
    // Arrange
    mockedDrawService.runDraw.mockRejectedValue(new AppError(409, "No eligible candidates to draw from"));

    // Act
    const res = await request(app)
      .post("/api/admin/draws")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ deviceId: 1 });

    // Assert
    expect(res.status).toBe(409);
  });
});
