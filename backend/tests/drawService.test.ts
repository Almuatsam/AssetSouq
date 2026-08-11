import { prisma } from "../src/config/prisma";
import { deviceRepository } from "../src/repositories/deviceRepository";
import { drawRepository } from "../src/repositories/drawRepository";
import { employeeRepository } from "../src/repositories/employeeRepository";
import { registrationRepository } from "../src/repositories/registrationRepository";
import { drawService } from "../src/services/drawService";
import { eligibilityService } from "../src/services/eligibilityService";
import * as rng from "../src/utils/rng";

jest.mock("../src/config/prisma", () => ({
  // runDraw()'s writes happen inside prisma.$transaction — just invoke the
  // callback with a placeholder tx object; every repository call inside
  // it is separately mocked below, so what "tx" actually is doesn't
  // matter for these tests, only that the callback runs.
  prisma: { $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})) },
}));
jest.mock("../src/repositories/deviceRepository");
jest.mock("../src/repositories/drawRepository");
jest.mock("../src/repositories/employeeRepository");
jest.mock("../src/repositories/registrationRepository");
jest.mock("../src/services/eligibilityService");
jest.mock("../src/utils/rng");

const mockedPrisma = prisma as unknown as { $transaction: jest.Mock };
const mockedDeviceRepo = deviceRepository as jest.Mocked<typeof deviceRepository>;
const mockedDrawRepo = drawRepository as jest.Mocked<typeof drawRepository>;
const mockedEmployeeRepo = employeeRepository as jest.Mocked<typeof employeeRepository>;
const mockedRegistrationRepo = registrationRepository as jest.Mocked<typeof registrationRepository>;
const mockedEligibility = eligibilityService as jest.Mocked<typeof eligibilityService>;
const mockedRng = rng as jest.Mocked<typeof rng>;

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

const baseEmployee = {
  id: 10,
  staffNumber: "S1001",
  name: "Jane Doe",
  department: "IT",
  email: "jane@example.com",
  active: true,
  laptopHolder: false,
  lastWinnerDate: null,
  eligible: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function registration(employeeId: number) {
  return {
    id: employeeId,
    employeeId,
    deviceId: 1,
    agreed: true,
    submittedAt: new Date(),
    status: "ELIGIBLE" as const,
  };
}

const baseDrawResult = {
  id: 100,
  deviceId: 1,
  rngSeed: "seed",
  candidatePoolSnapshot: [10],
  drawnAt: new Date(),
  drawnByAdminId: 1,
  winners: [],
};

describe("drawService.runDraw", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({}));
    mockedRng.generateSeed.mockReturnValue("seed");
    // Identity "shuffle" — the seeded-shuffle algorithm itself is covered
    // by tests/rng.test.ts; these tests only need a deterministic,
    // order-preserving stand-in so assertions on who wins are simple.
    mockedRng.seededShuffle.mockImplementation((items) => [...items]);
    mockedEligibility.checkEmployeeAttributes.mockReturnValue({ eligible: true, reasons: [] });
    mockedDrawRepo.create.mockResolvedValue(baseDrawResult as never);
    mockedDrawRepo.createWinner.mockResolvedValue({} as never);
    mockedEmployeeRepo.markAsWinner.mockResolvedValue(baseEmployee as never);
    mockedDeviceRepo.markDrawn.mockResolvedValue(baseDevice as never);
    mockedDrawRepo.findByIdWithWinners.mockResolvedValue(baseDrawResult as never);
  });

  it("rejects with a 404 when the device doesn't exist", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects with a 409 when the device isn't AVAILABLE", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, status: "DRAWN" } as never);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedRegistrationRepo.findEligibleByDeviceId).not.toHaveBeenCalled();
  });

  // Regression: closes the TOCTOU race where two concurrent runDraw()
  // calls for the same device could both pass the pre-check above (which
  // reads outside any transaction) before either commits. The row lock +
  // re-check inside the transaction must catch a device that's no longer
  // AVAILABLE by the time this call actually gets to write.
  it("re-verifies device availability under a lock inside the transaction, rejecting a race where it's no longer AVAILABLE", async () => {
    // Arrange — simulates a concurrent draw that already flipped the
    // device to DRAWN between this call's pre-check and the point where
    // its own transaction acquires the device row lock.
    mockedDeviceRepo.findById
      .mockResolvedValueOnce(baseDevice as never) // pre-check, outside the transaction
      .mockResolvedValueOnce({ ...baseDevice, status: "DRAWN" } as never); // re-check, inside it
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDeviceRepo.lockForUpdate).toHaveBeenCalledWith(1, expect.anything());
    expect(mockedDrawRepo.create).not.toHaveBeenCalled();
  });

  it("locks the device row before creating the draw", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDeviceRepo.lockForUpdate).toHaveBeenCalledWith(1, expect.anything());
  });

  it("rejects with a 409 when there are no ELIGIBLE registrations at all", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([]);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.create).not.toHaveBeenCalled();
  });

  it("rejects with a 409 when every candidate fails re-validation at draw time", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    mockedEligibility.checkEmployeeAttributes.mockReturnValue({
      eligible: false,
      reasons: ["Laptop holders cannot participate"],
    });

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.create).not.toHaveBeenCalled();
  });

  // Regression: checkEmployeeAttributes (not the full checkEmployee) must
  // be used here — checkEmployee's "no other active registration" check
  // would find the candidate's own ELIGIBLE registration for this exact
  // device and disqualify every candidate, every time.
  it("uses checkEmployeeAttributes, not the full checkEmployee, to re-validate candidates", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedEligibility.checkEmployeeAttributes).toHaveBeenCalledWith(baseEmployee);
    expect(mockedEligibility.checkEmployee).not.toHaveBeenCalled();
  });

  it("excludes a candidate who fails employee-attribute eligibility at draw time", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never); // quantity 1
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10), registration(11)]);
    mockedEmployeeRepo.findById.mockImplementation((id: number) =>
      Promise.resolve({ ...baseEmployee, id } as never),
    );
    mockedEligibility.checkEmployeeAttributes.mockImplementation((employee) =>
      employee.id === 11
        ? { eligible: false, reasons: ["Laptop holders cannot participate"] }
        : { eligible: true, reasons: [] },
    );

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDrawRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ candidatePoolSnapshot: [10] }),
      expect.anything(),
    );
  });

  it("selects device.quantity winners and creates a Winner row + sets lastWinnerDate for each", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, quantity: 2 } as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([
      registration(10),
      registration(11),
      registration(12),
    ]);
    mockedEmployeeRepo.findById.mockImplementation((id: number) =>
      Promise.resolve({ ...baseEmployee, id } as never),
    );

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledTimes(2);
    expect(mockedEmployeeRepo.markAsWinner).toHaveBeenCalledTimes(2);
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 10, deviceId: 1, priceDue: baseDevice.price }),
      expect.anything(),
    );
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 11 }),
      expect.anything(),
    );
  });

  it("does not create a Winner row for candidates beyond device.quantity", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, quantity: 1 } as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10), registration(11)]);
    mockedEmployeeRepo.findById.mockImplementation((id: number) =>
      Promise.resolve({ ...baseEmployee, id } as never),
    );

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledTimes(1);
    expect(mockedDrawRepo.createWinner).not.toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 11 }),
      expect.anything(),
    );
  });

  it("marks the device as DRAWN", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDeviceRepo.markDrawn).toHaveBeenCalledWith(1, expect.anything());
  });

  it("persists the full shuffled candidate pool (not just the winners) and the RNG seed/admin id for audit", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, quantity: 1 } as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([
      registration(10),
      registration(11),
      registration(12),
    ]);
    mockedEmployeeRepo.findById.mockImplementation((id: number) =>
      Promise.resolve({ ...baseEmployee, id } as never),
    );

    // Act
    await drawService.runDraw(1, 42);

    // Assert
    expect(mockedDrawRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 1,
        candidatePoolSnapshot: [10, 11, 12],
        rngSeed: "seed",
        drawnByAdminId: 42,
      }),
      expect.anything(),
    );
  });

  it("returns the reloaded draw with its winners", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    const reloaded = { ...baseDrawResult, winners: [{ id: 1, employeeId: 10 }] };
    mockedDrawRepo.findByIdWithWinners.mockResolvedValue(reloaded as never);

    // Act
    const result = await drawService.runDraw(1, 1);

    // Assert
    expect(result).toEqual(reloaded);
  });

  it("throws a 500 if the draw cannot be reloaded after creation (defensive, should be unreachable)", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    mockedDrawRepo.findByIdWithWinners.mockResolvedValue(null);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 500 });
  });
});
