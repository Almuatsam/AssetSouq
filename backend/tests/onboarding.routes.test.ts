import request from "supertest";

import { createApp } from "../src/app";
import { onboardingService } from "../src/services/onboardingService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/onboardingService");

const mockedOnboardingService = onboardingService as jest.Mocked<typeof onboardingService>;

const app = createApp();

const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });
const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });

const baseProgress = {
  status: "not_started" as const,
  currentStepId: null,
  tourVersion: null,
  whatsNewSeenVersion: null,
  checklist: { dismissed: false, items: {} },
};

describe("GET /api/onboarding/me", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/onboarding/me");

    // Assert
    expect(res.status).toBe(401);
  });

  it("is reachable by an EMPLOYEE (not role-gated like /registrations)", async () => {
    // Arrange
    mockedOnboardingService.getOrCreateForUser.mockResolvedValue(baseProgress);

    // Act
    const res = await request(app).get("/api/onboarding/me").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { progress: baseProgress } });
    expect(mockedOnboardingService.getOrCreateForUser).toHaveBeenCalledWith({ role: "EMPLOYEE", id: 10 });
  });

  it("is reachable by an ADMIN", async () => {
    // Arrange
    mockedOnboardingService.getOrCreateForUser.mockResolvedValue(baseProgress);

    // Act
    const res = await request(app).get("/api/onboarding/me").set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(mockedOnboardingService.getOrCreateForUser).toHaveBeenCalledWith({ role: "ADMIN", id: 1 });
  });

  it("falls back to a generic 500 when the service throws unexpectedly", async () => {
    // Arrange
    mockedOnboardingService.getOrCreateForUser.mockRejectedValue(new Error("db connection refused"));

    // Act
    const res = await request(app).get("/api/onboarding/me").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/onboarding/me", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).patch("/api/onboarding/me").send({ action: "start" });

    // Assert
    expect(res.status).toBe(401);
  });

  it("passes a valid action through to the service", async () => {
    // Arrange
    mockedOnboardingService.updateForUser.mockResolvedValue({
      ...baseProgress,
      status: "in_progress",
    });

    // Act
    const res = await request(app)
      .patch("/api/onboarding/me")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ action: "start", currentStepId: "employee-welcome" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.progress.status).toBe("in_progress");
    expect(mockedOnboardingService.updateForUser).toHaveBeenCalledWith(
      { role: "EMPLOYEE", id: 10 },
      { action: "start", currentStepId: "employee-welcome" },
    );
  });

  it("returns 400 for an invalid action value (validation, before the service is called)", async () => {
    // Act
    const res = await request(app)
      .patch("/api/onboarding/me")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ action: "not-a-real-action" });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedOnboardingService.updateForUser).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown field (schema is .strict())", async () => {
    // Act
    const res = await request(app)
      .patch("/api/onboarding/me")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ someUnrelatedField: true });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedOnboardingService.updateForUser).not.toHaveBeenCalled();
  });

  it("accepts an empty body (all fields optional)", async () => {
    // Arrange
    mockedOnboardingService.updateForUser.mockResolvedValue(baseProgress);

    // Act
    const res = await request(app)
      .patch("/api/onboarding/me")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({});

    // Assert
    expect(res.status).toBe(200);
    expect(mockedOnboardingService.updateForUser).toHaveBeenCalledWith({ role: "EMPLOYEE", id: 10 }, {});
  });
});
