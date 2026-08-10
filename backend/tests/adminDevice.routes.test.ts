import request from "supertest";

import { createApp } from "../src/app";
import { AppError } from "../src/middlewares/errorHandler";
import { deviceService } from "../src/services/deviceService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/deviceService");

const mockedDeviceService = deviceService as jest.Mocked<typeof deviceService>;

const app = createApp();

const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });
const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

const baseDevice = {
  id: 1,
  assetTag: "AST-001",
  deviceType: "Laptop",
  brand: "Dell",
  model: "Latitude 5420",
  cpu: null,
  ram: null,
  storage: null,
  purchaseYear: null,
  yearsUsed: null,
  price: "150.00",
  status: "AVAILABLE",
  quantity: 1,
  createdAt: new Date(),
};

describe("GET /api/admin/devices", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/admin/devices");

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees (admin-only route)", async () => {
    // Act
    const res = await request(app).get("/api/admin/devices").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(403);
  });

  it("returns every device for an authenticated admin", async () => {
    // Arrange
    mockedDeviceService.listAll.mockResolvedValue([baseDevice] as never);

    // Act
    const res = await request(app).get("/api/admin/devices").set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.devices).toHaveLength(1);
    expect(mockedDeviceService.listAll).toHaveBeenCalledWith(undefined);
  });

  it("passes a status query filter through to the service", async () => {
    // Arrange
    mockedDeviceService.listAll.mockResolvedValue([]);

    // Act
    const res = await request(app)
      .get("/api/admin/devices?status=REMOVED")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(mockedDeviceService.listAll).toHaveBeenCalledWith("REMOVED");
  });

  it("returns 400 for an invalid status filter", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/devices?status=NOT_A_STATUS")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(400);
    expect(mockedDeviceService.listAll).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/devices", () => {
  const validPayload = {
    assetTag: "AST-002",
    deviceType: "Laptop",
    brand: "HP",
    model: "EliteBook 840",
    price: 200,
  };

  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).post("/api/admin/devices").send(validPayload);

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees", async () => {
    // Act
    const res = await request(app)
      .post("/api/admin/devices")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(403);
  });

  it("creates the device for an authenticated admin", async () => {
    // Arrange
    mockedDeviceService.createDevice.mockResolvedValue({ ...baseDevice, ...validPayload } as never);

    // Act
    const res = await request(app)
      .post("/api/admin/devices")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.data.device.assetTag).toBe("AST-002");
  });

  it("returns 400 for an invalid payload (validation, before the service is called)", async () => {
    // Act
    const res = await request(app)
      .post("/api/admin/devices")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validPayload, price: -5 });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedDeviceService.createDevice).not.toHaveBeenCalled();
  });

  it("returns 409 when the asset tag is already in use", async () => {
    // Arrange
    mockedDeviceService.createDevice.mockRejectedValue(
      new AppError(409, "A device with this asset tag already exists"),
    );

    // Act
    const res = await request(app)
      .post("/api/admin/devices")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/admin/devices/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).patch("/api/admin/devices/1").send({ price: 175 });

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/devices/1")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ price: 175 });

    // Assert
    expect(res.status).toBe(403);
  });

  it("updates the device for an authenticated admin", async () => {
    // Arrange
    mockedDeviceService.updateDevice.mockResolvedValue({ ...baseDevice, price: "175.00" } as never);

    // Act
    const res = await request(app)
      .patch("/api/admin/devices/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 175 });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.device.price).toBe("175.00");
    expect(mockedDeviceService.updateDevice).toHaveBeenCalledWith(1, { price: 175 });
  });

  it("returns 400 for an empty update body", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/devices/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    // Assert
    expect(res.status).toBe(400);
    expect(mockedDeviceService.updateDevice).not.toHaveBeenCalled();
  });

  it("returns 409 when trying to remove a device that isn't AVAILABLE", async () => {
    // Arrange
    mockedDeviceService.updateDevice.mockRejectedValue(
      new AppError(409, "Only an available device can be removed"),
    );

    // Act
    const res = await request(app)
      .patch("/api/admin/devices/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "REMOVED" });

    // Assert
    expect(res.status).toBe(409);
  });

  it("returns 404 when the device doesn't exist", async () => {
    // Arrange
    mockedDeviceService.updateDevice.mockRejectedValue(new AppError(404, "Device not found"));

    // Act
    const res = await request(app)
      .patch("/api/admin/devices/999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 175 });

    // Assert
    expect(res.status).toBe(404);
  });
});
