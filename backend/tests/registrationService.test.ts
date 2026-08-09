import { prisma } from "../src/config/prisma";
import { deviceRepository } from "../src/repositories/deviceRepository";
import { registrationRepository } from "../src/repositories/registrationRepository";
import { eligibilityService } from "../src/services/eligibilityService";
import { registrationService } from "../src/services/registrationService";

jest.mock("../src/config/prisma", () => ({
  // registerInterest()'s locked re-check runs inside prisma.$transaction —
  // just invoke the callback with a placeholder tx object; the repository
  // itself is separately mocked below, so what "tx" actually is doesn't
  // matter for these tests, only that the callback runs.
  prisma: { $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})) },
}));
jest.mock("../src/repositories/deviceRepository");
jest.mock("../src/repositories/registrationRepository");
jest.mock("../src/services/eligibilityService");

const mockedPrisma = prisma as unknown as { $transaction: jest.Mock };
const mockedDeviceRepo = deviceRepository as jest.Mocked<typeof deviceRepository>;
const mockedRegistrationRepo = registrationRepository as jest.Mocked<typeof registrationRepository>;
const mockedEligibility = eligibilityService as jest.Mocked<typeof eligibilityService>;

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

describe("registrationService.registerInterest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({}));
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedEligibility.checkEmployee.mockResolvedValue({ eligible: true, reasons: [] });
    mockedRegistrationRepo.lockEmployeeForUpdate.mockResolvedValue(undefined);
    mockedRegistrationRepo.findActiveByEmployeeId.mockResolvedValue(null);
  });

  it("creates the registration when everything checks out", async () => {
    // Arrange
    mockedRegistrationRepo.create.mockResolvedValue({
      id: 1,
      employeeId: 10,
      deviceId: 1,
      agreed: true,
      submittedAt: new Date(),
      status: "ELIGIBLE",
    });

    // Act
    const result = await registrationService.registerInterest(10, 1, true);

    // Assert
    expect(result.status).toBe("ELIGIBLE");
    expect(mockedRegistrationRepo.lockEmployeeForUpdate).toHaveBeenCalledWith(10, expect.anything());
    expect(mockedRegistrationRepo.create).toHaveBeenCalledWith(
      { employeeId: 10, deviceId: 1, agreed: true },
      expect.anything(),
    );
  });

  it("rejects with a 403 when a concurrent request already created an active registration (locked re-check)", async () => {
    // Arrange — simulates the race the transaction lock exists to close:
    // eligibilityService's earlier check passed, but by the time this
    // request takes the lock, another request for the same employee has
    // already landed.
    mockedRegistrationRepo.findActiveByEmployeeId.mockResolvedValue({
      id: 99,
      employeeId: 10,
      deviceId: 2,
      agreed: true,
      submittedAt: new Date(),
      status: "ELIGIBLE",
    });

    // Act / Assert
    await expect(registrationService.registerInterest(10, 1, true)).rejects.toMatchObject({
      statusCode: 403,
      message: "Already has an active registration for a device",
    });
    expect(mockedRegistrationRepo.create).not.toHaveBeenCalled();
  });

  it("rejects with a 400 when Terms & Conditions aren't agreed to", async () => {
    // Act / Assert
    await expect(registrationService.registerInterest(10, 1, false)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockedDeviceRepo.findById).not.toHaveBeenCalled();
  });

  it("rejects with a 404 when the device doesn't exist", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(registrationService.registerInterest(10, 999, true)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("rejects with a 409 when the device isn't AVAILABLE", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, status: "REMOVED" } as never);

    // Act / Assert
    await expect(registrationService.registerInterest(10, 1, true)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mockedEligibility.checkEmployee).not.toHaveBeenCalled();
  });

  it("rejects with a 403 carrying the eligibility reasons when ineligible", async () => {
    // Arrange
    mockedEligibility.checkEmployee.mockResolvedValue({
      eligible: false,
      reasons: ["Laptop holders cannot participate"],
    });

    // Act / Assert
    await expect(registrationService.registerInterest(10, 1, true)).rejects.toMatchObject({
      statusCode: 403,
      message: "Laptop holders cannot participate",
    });
    expect(mockedRegistrationRepo.create).not.toHaveBeenCalled();
  });
});

describe("registrationService.getMyRegistration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the employee's latest registration", async () => {
    // Arrange
    const registration = {
      id: 1,
      employeeId: 10,
      deviceId: 1,
      agreed: true,
      submittedAt: new Date(),
      status: "ELIGIBLE" as const,
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
    mockedRegistrationRepo.findLatestByEmployeeId.mockResolvedValue(registration);

    // Act
    const result = await registrationService.getMyRegistration(10);

    // Assert
    expect(result).toEqual(registration);
  });

  it("returns null when the employee has never registered", async () => {
    // Arrange
    mockedRegistrationRepo.findLatestByEmployeeId.mockResolvedValue(null);

    // Act
    const result = await registrationService.getMyRegistration(10);

    // Assert
    expect(result).toBeNull();
  });
});
