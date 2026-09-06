import request from "supertest";

import { createApp } from "../src/app";
import { adminAccountService } from "../src/services/adminAccountService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/adminAccountService");

const mockedAdminAccountService = adminAccountService as jest.Mocked<typeof adminAccountService>;

const app = createApp();

// A fresh admin id (and therefore token) per call — the real endpoint is
// deliberately rate-limited to 5 requests per 15 minutes per admin (see
// middlewares/rateLimit.ts's adminAccountCredentialsRateLimiter comment:
// this is a once-ever action in practice), which this file's own request
// volume would otherwise trip since the limiter keys on req.user.id.
let nextAdminId = 80000;
function issueAdminToken(username = "dev_admin") {
  nextAdminId += 1;
  return { id: nextAdminId, token: signToken({ role: "ADMIN", id: nextAdminId, username }) };
}

const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

const validPayload = {
  newUsername: "company_admin",
  newPassword: "CompanyPass123",
  confirmPassword: "CompanyPass123",
};

function updatedAdminFor(id: number) {
  return {
    id,
    username: "company_admin",
    lastLogin: null,
    credentialsChangedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("PATCH /api/admin/account/credentials", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).patch("/api/admin/account/credentials").send(validPayload);

    // Assert
    expect(res.status).toBe(401);
    expect(mockedAdminAccountService.changeInitialCredentials).not.toHaveBeenCalled();
  });

  it("is not available to employees (admin-only route)", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(403);
    expect(mockedAdminAccountService.changeInitialCredentials).not.toHaveBeenCalled();
  });

  it("succeeds for a valid payload and returns the updated admin without passwordHash", async () => {
    // Arrange
    const { id, token } = issueAdminToken();
    mockedAdminAccountService.changeInitialCredentials.mockResolvedValue(updatedAdminFor(id));

    // Act
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.admin).toMatchObject({ id, username: "company_admin" });
    expect(res.body.data.admin.passwordHash).toBeUndefined();
    expect(mockedAdminAccountService.changeInitialCredentials).toHaveBeenCalledWith(id, validPayload);
  });

  it("rejects an empty new username", async () => {
    // Arrange
    const { token } = issueAdminToken();

    // Act
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validPayload, newUsername: "" });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedAdminAccountService.changeInitialCredentials).not.toHaveBeenCalled();
  });

  it("rejects a new username that is only whitespace", async () => {
    // Arrange
    const { token } = issueAdminToken();

    // Act
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validPayload, newUsername: "   " });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedAdminAccountService.changeInitialCredentials).not.toHaveBeenCalled();
  });

  it("rejects a password that fails the strength policy (too short)", async () => {
    // Arrange
    const { token } = issueAdminToken();

    // Act
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validPayload, newPassword: "Short1", confirmPassword: "Short1" });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedAdminAccountService.changeInitialCredentials).not.toHaveBeenCalled();
  });

  it("rejects a password missing an uppercase letter", async () => {
    // Arrange
    const { token } = issueAdminToken();

    // Act
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validPayload, newPassword: "alllowercase123", confirmPassword: "alllowercase123" });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedAdminAccountService.changeInitialCredentials).not.toHaveBeenCalled();
  });

  it("rejects when confirmPassword does not match newPassword", async () => {
    // Arrange
    const { token } = issueAdminToken();

    // Act
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validPayload, confirmPassword: "SomethingElse123" });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedAdminAccountService.changeInitialCredentials).not.toHaveBeenCalled();
  });

  it("does not require or accept a current-password field", async () => {
    // Arrange
    const { id, token } = issueAdminToken();
    mockedAdminAccountService.changeInitialCredentials.mockResolvedValue(updatedAdminFor(id));

    // Act — extra unexpected field alongside the real payload.
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validPayload, currentPassword: "irrelevant" });

    // Assert
    expect(res.status).toBe(200);
    expect(mockedAdminAccountService.changeInitialCredentials).toHaveBeenCalledWith(id, validPayload);
  });

  it("surfaces a 409 from the service when the one-time handover was already completed", async () => {
    // Arrange
    const { token } = issueAdminToken();
    const { AppError } = jest.requireActual("../src/middlewares/errorHandler");
    mockedAdminAccountService.changeInitialCredentials.mockRejectedValue(
      new AppError(409, "The one-time admin credential setup has already been completed"),
    );

    // Act
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("surfaces a 409 from the service when the requested username is already taken", async () => {
    // Arrange
    const { token } = issueAdminToken();
    const { AppError } = jest.requireActual("../src/middlewares/errorHandler");
    mockedAdminAccountService.changeInitialCredentials.mockRejectedValue(
      new AppError(409, "That username is already in use"),
    );

    // Act
    const res = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
