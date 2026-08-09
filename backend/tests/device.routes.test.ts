import request from "supertest";

import { createApp } from "../src/app";
import { AppError } from "../src/middlewares/errorHandler";
import { deviceService } from "../src/services/deviceService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/deviceService");

const mockedDeviceService = deviceService as jest.Mocked<typeof deviceService>;

const app = createApp();

const employeeToken = signToken({ role: "EMPLOYEE", id: 1, staffNumber: "S1001" });
const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });

describe("GET /api/devices", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/devices");

    // Assert
    expect(res.status).toBe(401);
  });

  it("returns the available devices for an authenticated employee", async () => {
    // Arrange
    mockedDeviceService.listAvailable.mockResolvedValue([{ id: 1 } as never]);

    // Act
    const res = await request(app).get("/api/devices").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { devices: [{ id: 1 }] } });
  });

  it("also allows an authenticated admin", async () => {
    // Arrange
    mockedDeviceService.listAvailable.mockResolvedValue([]);

    // Act
    const res = await request(app).get("/api/devices").set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
  });

  it("falls back to a generic 500 when the service throws unexpectedly", async () => {
    // Arrange
    mockedDeviceService.listAvailable.mockRejectedValue(new Error("db connection refused"));

    // Act
    const res = await request(app).get("/api/devices").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(500);
  });
});

describe("GET /api/devices/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the device", async () => {
    // Arrange
    mockedDeviceService.getById.mockResolvedValue({ id: 5 } as never);

    // Act
    const res = await request(app).get("/api/devices/5").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { device: { id: 5 } } });
    expect(mockedDeviceService.getById).toHaveBeenCalledWith(5);
  });

  it("returns 400 for a non-numeric id (validation, before the service is even called)", async () => {
    // Act
    const res = await request(app)
      .get("/api/devices/not-a-number")
      .set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(400);
    expect(mockedDeviceService.getById).not.toHaveBeenCalled();
  });

  it("returns 404 when the service reports the device doesn't exist", async () => {
    // Arrange
    mockedDeviceService.getById.mockRejectedValue(new AppError(404, "Device not found"));

    // Act
    const res = await request(app).get("/api/devices/999").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(404);
  });
});
