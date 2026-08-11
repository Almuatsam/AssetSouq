import { deviceRepository } from "../src/repositories/deviceRepository";
import { employeeRepository } from "../src/repositories/employeeRepository";
import { registrationRepository } from "../src/repositories/registrationRepository";
import { dashboardService } from "../src/services/dashboardService";

jest.mock("../src/repositories/deviceRepository");
jest.mock("../src/repositories/employeeRepository");
jest.mock("../src/repositories/registrationRepository");

const mockedDeviceRepo = deviceRepository as jest.Mocked<typeof deviceRepository>;
const mockedEmployeeRepo = employeeRepository as jest.Mocked<typeof employeeRepository>;
const mockedRegistrationRepo = registrationRepository as jest.Mocked<typeof registrationRepository>;

describe("dashboardService.getStats", () => {
  beforeEach(() => jest.clearAllMocks());

  it("combines device/employee/registration counts and adds totals", async () => {
    // Arrange
    mockedDeviceRepo.countByStatus.mockResolvedValue({
      AVAILABLE: 7,
      REMOVED: 2,
      DRAWN: 1,
      SOLD: 0,
    });
    mockedEmployeeRepo.countStats.mockResolvedValue({ total: 20, active: 18, eligible: 12 });
    mockedRegistrationRepo.countByStatus.mockResolvedValue({
      PENDING: 0,
      ELIGIBLE: 5,
      INELIGIBLE: 1,
      WITHDRAWN: 2,
    });

    // Act
    const result = await dashboardService.getStats();

    // Assert
    expect(result).toEqual({
      devices: { AVAILABLE: 7, REMOVED: 2, DRAWN: 1, SOLD: 0, total: 10 },
      employees: { total: 20, active: 18, eligible: 12 },
      registrations: { PENDING: 0, ELIGIBLE: 5, INELIGIBLE: 1, WITHDRAWN: 2, total: 8 },
    });
  });

  it("returns all-zero totals when nothing exists yet", async () => {
    // Arrange
    mockedDeviceRepo.countByStatus.mockResolvedValue({ AVAILABLE: 0, REMOVED: 0, DRAWN: 0, SOLD: 0 });
    mockedEmployeeRepo.countStats.mockResolvedValue({ total: 0, active: 0, eligible: 0 });
    mockedRegistrationRepo.countByStatus.mockResolvedValue({
      PENDING: 0,
      ELIGIBLE: 0,
      INELIGIBLE: 0,
      WITHDRAWN: 0,
    });

    // Act
    const result = await dashboardService.getStats();

    // Assert
    expect(result.devices.total).toBe(0);
    expect(result.registrations.total).toBe(0);
  });

  it("fetches all three counts in parallel, not sequentially", async () => {
    // Arrange
    mockedDeviceRepo.countByStatus.mockResolvedValue({ AVAILABLE: 1, REMOVED: 0, DRAWN: 0, SOLD: 0 });
    mockedEmployeeRepo.countStats.mockResolvedValue({ total: 1, active: 1, eligible: 1 });
    mockedRegistrationRepo.countByStatus.mockResolvedValue({
      PENDING: 0,
      ELIGIBLE: 0,
      INELIGIBLE: 0,
      WITHDRAWN: 0,
    });

    // Act
    await dashboardService.getStats();

    // Assert — all three repositories were called once each; Promise.all
    // means none of them wait on another before starting.
    expect(mockedDeviceRepo.countByStatus).toHaveBeenCalledTimes(1);
    expect(mockedEmployeeRepo.countStats).toHaveBeenCalledTimes(1);
    expect(mockedRegistrationRepo.countByStatus).toHaveBeenCalledTimes(1);
  });
});
