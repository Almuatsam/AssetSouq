import { onboardingRepository } from "../src/repositories/onboardingRepository";
import { onboardingService } from "../src/services/onboardingService";

jest.mock("../src/repositories/onboardingRepository");

const mockedRepo = onboardingRepository as jest.Mocked<typeof onboardingRepository>;

function baseRow(overrides: Partial<Parameters<typeof mockedRepo.update>[1]> & Record<string, unknown> = {}) {
  return {
    id: 1,
    employeeId: 10,
    adminId: null,
    tourStartedAt: null,
    tourCompletedAt: null,
    tourSkippedAt: null,
    currentStepId: null,
    tourVersion: null,
    whatsNewSeenVersion: null,
    checklist: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as never;
}

describe("onboardingService.getOrCreateForUser", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches the existing row for an Employee without creating one", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow());

    // Act
    const result = await onboardingService.getOrCreateForUser({ role: "EMPLOYEE", id: 10 });

    // Assert
    expect(result.status).toBe("not_started");
    expect(mockedRepo.createForEmployee).not.toHaveBeenCalled();
  });

  it("creates a default row for an Employee exactly once when none exists", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(null);
    mockedRepo.createForEmployee.mockResolvedValue(baseRow());

    // Act
    await onboardingService.getOrCreateForUser({ role: "EMPLOYEE", id: 10 });

    // Assert
    expect(mockedRepo.createForEmployee).toHaveBeenCalledTimes(1);
    expect(mockedRepo.createForEmployee).toHaveBeenCalledWith(10);
    expect(mockedRepo.createForAdmin).not.toHaveBeenCalled();
  });

  it("branches to the Admin repository methods for an ADMIN identity", async () => {
    // Arrange
    mockedRepo.findByAdminId.mockResolvedValue(null);
    mockedRepo.createForAdmin.mockResolvedValue(baseRow({ employeeId: null, adminId: 5 }));

    // Act
    await onboardingService.getOrCreateForUser({ role: "ADMIN", id: 5 });

    // Assert
    expect(mockedRepo.findByAdminId).toHaveBeenCalledWith(5);
    expect(mockedRepo.createForAdmin).toHaveBeenCalledWith(5);
    expect(mockedRepo.findByEmployeeId).not.toHaveBeenCalled();
  });

  it("derives status: in_progress once tourStartedAt is set", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow({ tourStartedAt: new Date() }));

    // Act
    const result = await onboardingService.getOrCreateForUser({ role: "EMPLOYEE", id: 10 });

    // Assert
    expect(result.status).toBe("in_progress");
  });

  it("derives status: completed over in_progress when both timestamps are set", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(
      baseRow({ tourStartedAt: new Date(), tourCompletedAt: new Date() }),
    );

    // Act
    const result = await onboardingService.getOrCreateForUser({ role: "EMPLOYEE", id: 10 });

    // Assert
    expect(result.status).toBe("completed");
  });

  it("derives status: skipped when tourSkippedAt is set", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow({ tourSkippedAt: new Date() }));

    // Act
    const result = await onboardingService.getOrCreateForUser({ role: "EMPLOYEE", id: 10 });

    // Assert
    expect(result.status).toBe("skipped");
  });

  it("normalizes a missing checklist shape to { dismissed: false, items: {} }", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow({ checklist: {} }));

    // Act
    const result = await onboardingService.getOrCreateForUser({ role: "EMPLOYEE", id: 10 });

    // Assert
    expect(result.checklist).toEqual({ dismissed: false, items: {} });
  });
});

describe("onboardingService.updateForUser — action → timestamp mapping", () => {
  beforeEach(() => jest.clearAllMocks());

  it('"start" stamps tourStartedAt only when it was null', async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow());
    mockedRepo.update.mockResolvedValue(baseRow({ tourStartedAt: new Date() }));

    // Act
    await onboardingService.updateForUser({ role: "EMPLOYEE", id: 10 }, { action: "start" });

    // Assert
    expect(mockedRepo.update).toHaveBeenCalledWith(1, { tourStartedAt: expect.any(Date) });
  });

  it('"start" is idempotent — a second call does not overwrite the original tourStartedAt', async () => {
    // Arrange
    const firstStart = new Date("2026-01-01T00:00:00.000Z");
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow({ tourStartedAt: firstStart }));
    mockedRepo.update.mockResolvedValue(baseRow({ tourStartedAt: firstStart }));

    // Act
    await onboardingService.updateForUser({ role: "EMPLOYEE", id: 10 }, { action: "start" });

    // Assert — no tourStartedAt key sent at all, since the row already has one
    expect(mockedRepo.update).toHaveBeenCalledWith(1, {});
  });

  it('"restart" stamps a fresh tourStartedAt and clears tourCompletedAt/tourSkippedAt', async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(
      baseRow({ tourStartedAt: new Date("2020-01-01"), tourCompletedAt: new Date("2020-01-02") }),
    );
    mockedRepo.update.mockResolvedValue(baseRow({ tourStartedAt: new Date() }));

    // Act
    await onboardingService.updateForUser({ role: "EMPLOYEE", id: 10 }, { action: "restart" });

    // Assert
    expect(mockedRepo.update).toHaveBeenCalledWith(1, {
      tourStartedAt: expect.any(Date),
      tourCompletedAt: null,
      tourSkippedAt: null,
    });
  });

  it('"complete" stamps tourCompletedAt', async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow({ tourStartedAt: new Date() }));
    mockedRepo.update.mockResolvedValue(baseRow({ tourCompletedAt: new Date() }));

    // Act
    await onboardingService.updateForUser({ role: "EMPLOYEE", id: 10 }, { action: "complete" });

    // Assert
    expect(mockedRepo.update).toHaveBeenCalledWith(1, { tourCompletedAt: expect.any(Date) });
  });

  it('"skip" stamps tourSkippedAt', async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow());
    mockedRepo.update.mockResolvedValue(baseRow({ tourSkippedAt: new Date() }));

    // Act
    await onboardingService.updateForUser({ role: "EMPLOYEE", id: 10 }, { action: "skip" });

    // Assert
    expect(mockedRepo.update).toHaveBeenCalledWith(1, { tourSkippedAt: expect.any(Date) });
  });

  it("creates a row first if none exists yet, then applies the action to the new row's id", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(null);
    mockedRepo.createForEmployee.mockResolvedValue(baseRow({ id: 42 }));
    mockedRepo.update.mockResolvedValue(baseRow({ id: 42, tourStartedAt: new Date() }));

    // Act
    await onboardingService.updateForUser({ role: "EMPLOYEE", id: 10 }, { action: "start" });

    // Assert
    expect(mockedRepo.update).toHaveBeenCalledWith(42, expect.anything());
  });
});

describe("onboardingService.updateForUser — field passthrough", () => {
  beforeEach(() => jest.clearAllMocks());

  it("writes currentStepId/tourVersion/whatsNewSeenVersion when provided", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow());
    mockedRepo.update.mockResolvedValue(baseRow());

    // Act
    await onboardingService.updateForUser(
      { role: "EMPLOYEE", id: 10 },
      { currentStepId: "employee-welcome", tourVersion: 1, whatsNewSeenVersion: 1 },
    );

    // Assert
    expect(mockedRepo.update).toHaveBeenCalledWith(1, {
      currentStepId: "employee-welcome",
      tourVersion: 1,
      whatsNewSeenVersion: 1,
    });
  });

  it("allows currentStepId: null to clear the resume position", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(baseRow({ currentStepId: "employee-welcome" }));
    mockedRepo.update.mockResolvedValue(baseRow({ currentStepId: null }));

    // Act
    await onboardingService.updateForUser({ role: "EMPLOYEE", id: 10 }, { currentStepId: null });

    // Assert
    expect(mockedRepo.update).toHaveBeenCalledWith(1, { currentStepId: null });
  });

  it("shallow-merges a checklist item update instead of overwriting the whole checklist", async () => {
    // Arrange — an existing checklist already has one item checked; the
    // patch only toggles a second one and must not lose the first.
    mockedRepo.findByEmployeeId.mockResolvedValue(
      baseRow({ checklist: { dismissed: false, items: { browseDevices: true } } }),
    );
    mockedRepo.update.mockResolvedValue(baseRow());

    // Act
    await onboardingService.updateForUser(
      { role: "EMPLOYEE", id: 10 },
      { checklist: { items: { learnRegistration: true } } },
    );

    // Assert
    expect(mockedRepo.update).toHaveBeenCalledWith(1, {
      checklist: {
        dismissed: false,
        items: { browseDevices: true, learnRegistration: true },
      },
    });
  });

  it("applies a dismissed:true patch without touching existing items", async () => {
    // Arrange
    mockedRepo.findByEmployeeId.mockResolvedValue(
      baseRow({ checklist: { dismissed: false, items: { browseDevices: true } } }),
    );
    mockedRepo.update.mockResolvedValue(baseRow());

    // Act
    await onboardingService.updateForUser(
      { role: "EMPLOYEE", id: 10 },
      { checklist: { dismissed: true } },
    );

    // Assert
    expect(mockedRepo.update).toHaveBeenCalledWith(1, {
      checklist: { dismissed: true, items: { browseDevices: true } },
    });
  });
});
