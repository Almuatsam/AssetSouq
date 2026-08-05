import request from "supertest";

import { createApp } from "../src/app";
import { authService } from "../src/services/authService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/authService");

const mockedAuthService = authService as jest.Mocked<typeof authService>;

const app = createApp();

describe("POST /api/auth/employee/login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with a token on success", async () => {
    // Arrange
    mockedAuthService.loginEmployee.mockResolvedValue({
      token: "fake-token",
      employee: { id: 1, staffNumber: "S1001" } as never,
    });

    // Act
    const res = await request(app)
      .post("/api/auth/employee/login")
      .send({ staffNumber: "S1001" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { token: "fake-token" } });
  });

  it("returns 400 when staffNumber is missing (validation)", async () => {
    // Act
    const res = await request(app).post("/api/auth/employee/login").send({});

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockedAuthService.loginEmployee).not.toHaveBeenCalled();
  });

  it("returns 401 with a generic message when the service rejects the login", async () => {
    // Arrange
    const { AppError } = jest.requireActual("../src/middlewares/errorHandler");
    mockedAuthService.loginEmployee.mockRejectedValue(new AppError(401, "Invalid staff ID"));

    // Act
    const res = await request(app)
      .post("/api/auth/employee/login")
      .send({ staffNumber: "UNKNOWN" });

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, error: "Invalid staff ID" });
  });
});

describe("POST /api/auth/admin/login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with a token on success", async () => {
    // Arrange
    mockedAuthService.loginAdmin.mockResolvedValue({
      token: "fake-admin-token",
      admin: { id: 1, username: "admin1", lastLogin: null } as never,
    });

    // Act
    const res = await request(app)
      .post("/api/auth/admin/login")
      .send({ username: "admin1", password: "correct-password" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { token: "fake-admin-token" } });
  });

  it("returns 400 when the payload fails validation", async () => {
    // Act
    const res = await request(app).post("/api/auth/admin/login").send({ username: "admin1" });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedAuthService.loginAdmin).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 with no Authorization header", async () => {
    // Act
    const res = await request(app).get("/api/auth/me");

    // Assert
    expect(res.status).toBe(401);
  });

  it("returns 401 with a malformed/invalid token", async () => {
    // Act
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer garbage");

    // Assert
    expect(res.status).toBe(401);
  });

  it("returns 401 when the Authorization header isn't a Bearer scheme", async () => {
    // Act
    const res = await request(app).get("/api/auth/me").set("Authorization", "Basic garbage");

    // Assert
    expect(res.status).toBe(401);
  });

  it("returns 401 when the Bearer token is empty", async () => {
    // Act — a lone trailing space is trimmed off in transit by the HTTP
    // layer before this reaches the server, so use two: one survives to
    // exercise the "Bearer " prefix matched but token is blank" branch.
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer  ");

    // Assert
    expect(res.status).toBe(401);
  });

  it("returns the decoded user with a valid token", async () => {
    // Arrange
    const token = signToken({ role: "ADMIN", id: 1, username: "admin1" });

    // Act
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ role: "ADMIN", id: 1, username: "admin1" });
  });
});

describe("unknown route", () => {
  it("returns 404 in the standard error envelope", async () => {
    // Act
    const res = await request(app).get("/api/does-not-exist");

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/health", () => {
  it("returns 200 ok", async () => {
    // Act
    const res = await request(app).get("/api/health");

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: "ok" } });
  });
});

describe("unexpected errors", () => {
  it("fall back to a generic 500 without leaking internals", async () => {
    // Arrange — a non-AppError, non-ZodError thrown from a handler.
    mockedAuthService.loginEmployee.mockRejectedValue(new Error("db connection refused: 1234"));

    // Act
    const res = await request(app)
      .post("/api/auth/employee/login")
      .send({ staffNumber: "S1001" });

    // Assert
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: "Internal server error" });
  });
});
