import { employeeRepository } from "../src/repositories/employeeRepository";
import { registrationRepository } from "../src/repositories/registrationRepository";
import { eligibilityService } from "../src/services/eligibilityService";

jest.mock("../src/repositories/employeeRepository");
jest.mock("../src/repositories/registrationRepository");

const mockedEmployeeRepo = employeeRepository as jest.Mocked<typeof employeeRepository>;
const mockedRegistrationRepo = registrationRepository as jest.Mocked<typeof registrationRepository>;

const baseEmployee = {
  id: 1,
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

describe("eligibilityService.checkEmployee", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRegistrationRepo.findActiveByEmployeeId.mockResolvedValue(null);
  });

  it("is eligible when every rule passes", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee);

    // Act
    const result = await eligibilityService.checkEmployee(1);

    // Assert
    expect(result).toEqual({ eligible: true, reasons: [] });
  });

  it("is ineligible with a clear reason when the employee doesn't exist", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(null);

    // Act
    const result = await eligibilityService.checkEmployee(999);

    // Assert
    expect(result).toEqual({ eligible: false, reasons: ["Employee not found"] });
    expect(mockedRegistrationRepo.findActiveByEmployeeId).not.toHaveBeenCalled();
  });

  it("flags an inactive employee", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue({ ...baseEmployee, active: false });

    // Act
    const result = await eligibilityService.checkEmployee(1);

    // Assert
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("Employee account is not active");
  });

  it("flags an employee marked ineligible by an admin", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue({ ...baseEmployee, eligible: false });

    // Act
    const result = await eligibilityService.checkEmployee(1);

    // Assert
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("Employee is marked ineligible");
  });

  it("flags a laptop holder", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue({ ...baseEmployee, laptopHolder: true });

    // Act
    const result = await eligibilityService.checkEmployee(1);

    // Assert
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("Laptop holders cannot participate");
  });

  it("flags a recent previous winner (within 24 months)", async () => {
    // Arrange
    const tenMonthsAgo = new Date();
    tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);
    mockedEmployeeRepo.findById.mockResolvedValue({ ...baseEmployee, lastWinnerDate: tenMonthsAgo });

    // Act
    const result = await eligibilityService.checkEmployee(1);

    // Assert
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("Must wait 24 months after a previous win");
  });

  it("does not flag a previous winner past the 24-month cooldown", async () => {
    // Arrange
    const twentyFiveMonthsAgo = new Date();
    twentyFiveMonthsAgo.setMonth(twentyFiveMonthsAgo.getMonth() - 25);
    mockedEmployeeRepo.findById.mockResolvedValue({ ...baseEmployee, lastWinnerDate: twentyFiveMonthsAgo });

    // Act
    const result = await eligibilityService.checkEmployee(1);

    // Assert
    expect(result.eligible).toBe(true);
  });

  it("flags an employee with an existing active registration", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee);
    mockedRegistrationRepo.findActiveByEmployeeId.mockResolvedValue({
      id: 5,
      employeeId: 1,
      deviceId: 2,
      agreed: true,
      submittedAt: new Date(),
      status: "PENDING",
    });

    // Act
    const result = await eligibilityService.checkEmployee(1);

    // Assert
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("Already has an active registration for a device");
  });

  it("collects every failing reason at once rather than stopping at the first", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue({
      ...baseEmployee,
      active: false,
      laptopHolder: true,
    });

    // Act
    const result = await eligibilityService.checkEmployee(1);

    // Assert
    expect(result.reasons).toEqual(
      expect.arrayContaining(["Employee account is not active", "Laptop holders cannot participate"]),
    );
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
