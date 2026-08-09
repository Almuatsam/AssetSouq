import request from "supertest";

import { createApp } from "../src/app";
import { AppError } from "../src/middlewares/errorHandler";
import { registrationService } from "../src/services/registrationService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/registrationService");

const mockedRegistrationService = registrationService as jest.Mocked<typeof registrationService>;

const app = createApp();

const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });
const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });

describe("POST /api/registrations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).post("/api/registrations").send({ deviceId: 1, agreed: true });

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to admins (employee-only route)", async () => {
    // Act
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ deviceId: 1, agreed: true });

    // Assert
    expect(res.status).toBe(403);
  });

  it("creates the registration for an eligible employee", async () => {
    // Arrange
    mockedRegistrationService.registerInterest.mockResolvedValue({
      id: 1,
      employeeId: 10,
      deviceId: 1,
      agreed: true,
      submittedAt: new Date(),
      status: "ELIGIBLE",
    });

    // Act
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ deviceId: 1, agreed: true });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, data: { registration: { status: "ELIGIBLE" } } });
    expect(mockedRegistrationService.registerInterest).toHaveBeenCalledWith(10, 1, true);
  });

  it("returns 400 when agreed is missing (validation, before the service is called)", async () => {
    // Act
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ deviceId: 1 });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedRegistrationService.registerInterest).not.toHaveBeenCalled();
  });

  it("returns 403 with the eligibility reason when the service rejects", async () => {
    // Arrange
    mockedRegistrationService.registerInterest.mockRejectedValue(
      new AppError(403, "Laptop holders cannot participate"),
    );

    // Act
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ deviceId: 1, agreed: true });

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Laptop holders cannot participate");
  });

  it("falls back to a generic 500 when the service throws unexpectedly", async () => {
    // Arrange
    mockedRegistrationService.registerInterest.mockRejectedValue(new Error("db connection refused"));

    // Act
    const res = await request(app)
      .post("/api/registrations")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ deviceId: 1, agreed: true });

    // Assert
    expect(res.status).toBe(500);
  });
});

describe("GET /api/registrations/me", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/registrations/me");

    // Assert
    expect(res.status).toBe(401);
  });

  it("returns the employee's current registration", async () => {
    // Arrange
    mockedRegistrationService.getMyRegistration.mockResolvedValue({
      id: 1,
      employeeId: 10,
      deviceId: 1,
      agreed: true,
      submittedAt: new Date(),
      status: "ELIGIBLE",
      device: {
        id: 1,
        assetTag: "AST-001",
        deviceType: "Laptop",
        brand: "Dell",
        model: "Latitude 5420",
        price: "150.00",
        status: "AVAILABLE",
      },
    });

    // Act
    const res = await request(app).get("/api/registrations/me").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.registration.status).toBe("ELIGIBLE");
    expect(mockedRegistrationService.getMyRegistration).toHaveBeenCalledWith(10);
  });

  it("returns null when the employee has never registered", async () => {
    // Arrange
    mockedRegistrationService.getMyRegistration.mockResolvedValue(null);

    // Act
    const res = await request(app).get("/api/registrations/me").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.registration).toBeNull();
  });

  it("falls back to a generic 500 when the service throws unexpectedly", async () => {
    // Arrange
    mockedRegistrationService.getMyRegistration.mockRejectedValue(new Error("db connection refused"));

    // Act
    const res = await request(app).get("/api/registrations/me").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(500);
  });
});
