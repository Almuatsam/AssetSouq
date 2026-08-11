import request from "supertest";

import { createApp } from "../src/app";
import { AppError } from "../src/middlewares/errorHandler";
import { registrationService } from "../src/services/registrationService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/registrationService");

const mockedRegistrationService = registrationService as jest.Mocked<typeof registrationService>;

const app = createApp();

const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });
const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

const baseRegistration = {
  id: 1,
  employeeId: 10,
  deviceId: 1,
  agreed: true,
  submittedAt: new Date(),
  status: "ELIGIBLE",
  employee: { id: 10, staffNumber: "S1001", name: "Jane Doe", department: "Engineering" },
  device: {
    id: 1,
    assetTag: "AST-001",
    deviceType: "Laptop",
    brand: "Dell",
    model: "Latitude 5420",
    price: "150.00",
    status: "AVAILABLE",
  },
};

describe("GET /api/admin/registrations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/admin/registrations");

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees (admin-only route)", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/registrations")
      .set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(403);
  });

  it("returns every registration for an authenticated admin", async () => {
    // Arrange
    mockedRegistrationService.listAllForAdmin.mockResolvedValue([baseRegistration] as never);

    // Act
    const res = await request(app)
      .get("/api/admin/registrations")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.registrations).toHaveLength(1);
    expect(mockedRegistrationService.listAllForAdmin).toHaveBeenCalledWith({});
  });

  it("passes filters through to the service", async () => {
    // Arrange
    mockedRegistrationService.listAllForAdmin.mockResolvedValue([]);

    // Act
    const res = await request(app)
      .get("/api/admin/registrations?status=WITHDRAWN&deviceId=1")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(mockedRegistrationService.listAllForAdmin).toHaveBeenCalledWith({
      status: "WITHDRAWN",
      deviceId: 1,
    });
  });

  it("returns 400 for an invalid status filter", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/registrations?status=NOT_A_STATUS")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(400);
    expect(mockedRegistrationService.listAllForAdmin).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/registrations/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).patch("/api/admin/registrations/1").send({ status: "WITHDRAWN" });

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/registrations/1")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "WITHDRAWN" });

    // Assert
    expect(res.status).toBe(403);
  });

  it("updates the registration status for an authenticated admin", async () => {
    // Arrange
    mockedRegistrationService.updateStatus.mockResolvedValue({
      ...baseRegistration,
      status: "WITHDRAWN",
    } as never);

    // Act
    const res = await request(app)
      .patch("/api/admin/registrations/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "WITHDRAWN" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.registration.status).toBe("WITHDRAWN");
    expect(mockedRegistrationService.updateStatus).toHaveBeenCalledWith(1, "WITHDRAWN");
  });

  it("returns 400 for a missing status", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/registrations/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    // Assert
    expect(res.status).toBe(400);
    expect(mockedRegistrationService.updateStatus).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid status", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/registrations/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "PENDING" });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedRegistrationService.updateStatus).not.toHaveBeenCalled();
  });

  it("returns 409 when the transition isn't allowed", async () => {
    // Arrange
    mockedRegistrationService.updateStatus.mockRejectedValue(
      new AppError(409, "Cannot change registration status from WITHDRAWN to ELIGIBLE"),
    );

    // Act
    const res = await request(app)
      .patch("/api/admin/registrations/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ELIGIBLE" });

    // Assert
    expect(res.status).toBe(409);
  });

  it("returns 404 when the registration doesn't exist", async () => {
    // Arrange
    mockedRegistrationService.updateStatus.mockRejectedValue(new AppError(404, "Registration not found"));

    // Act
    const res = await request(app)
      .patch("/api/admin/registrations/999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "WITHDRAWN" });

    // Assert
    expect(res.status).toBe(404);
  });
});
