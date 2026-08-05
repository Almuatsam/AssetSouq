import { AppError } from "../src/middlewares/errorHandler";
import { adminRepository } from "../src/repositories/adminRepository";
import { employeeRepository } from "../src/repositories/employeeRepository";
import { authService } from "../src/services/authService";
import * as passwordUtil from "../src/utils/password";

jest.mock("../src/repositories/employeeRepository");
jest.mock("../src/repositories/adminRepository");
jest.mock("../src/utils/password");

const mockedEmployeeRepo = employeeRepository as jest.Mocked<typeof employeeRepository>;
const mockedAdminRepo = adminRepository as jest.Mocked<typeof adminRepository>;
const mockedPassword = passwordUtil as jest.Mocked<typeof passwordUtil>;

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

const baseAdmin = {
  id: 1,
  username: "admin1",
  passwordHash: "hashed-password",
  lastLogin: null,
};

describe("authService.loginEmployee", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns a token and the employee when the staff ID matches an active employee", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(baseEmployee);

    // Act
    const result = await authService.loginEmployee("S1001");

    // Assert
    expect(result.token).toEqual(expect.any(String));
    expect(result.employee).toMatchObject({ id: 1, staffNumber: "S1001" });
  });

  it("throws a generic 401 when the staff ID does not exist", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);

    // Act / Assert
    await expect(authService.loginEmployee("UNKNOWN")).rejects.toMatchObject({
      statusCode: 401,
    } satisfies Partial<AppError>);
  });

  it("throws the same generic 401 when the employee exists but is inactive (no enumeration)", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue({ ...baseEmployee, active: false });

    // Act
    const unknownError = await authService.loginEmployee("UNKNOWN2").catch((e) => e);
    const inactiveError = await authService.loginEmployee("S1001").catch((e) => e);

    // Assert — identical error shape so a caller can't distinguish "no such
    // staff ID" from "staff ID exists but is inactive".
    expect(inactiveError.message).toBe(unknownError.message);
    expect(inactiveError.statusCode).toBe(unknownError.statusCode);
  });
});

describe("authService.loginAdmin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns a token and the admin (without passwordHash) on valid credentials", async () => {
    // Arrange
    const loginTimestamp = new Date();
    mockedAdminRepo.findByUsername.mockResolvedValue(baseAdmin);
    mockedAdminRepo.updateLastLogin.mockResolvedValue({ ...baseAdmin, lastLogin: loginTimestamp });
    mockedPassword.verifyPassword.mockResolvedValue(true);

    // Act
    const result = await authService.loginAdmin("admin1", "correct-password");

    // Assert
    expect(result.token).toEqual(expect.any(String));
    expect(result.admin).toEqual({ id: 1, username: "admin1", lastLogin: loginTimestamp });
    expect((result.admin as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(mockedAdminRepo.updateLastLogin).toHaveBeenCalledWith(1);
  });

  it("throws a generic 401 when the username does not exist", async () => {
    // Arrange
    mockedAdminRepo.findByUsername.mockResolvedValue(null);
    mockedPassword.verifyPassword.mockResolvedValue(false);

    // Act / Assert
    await expect(authService.loginAdmin("nobody", "whatever")).rejects.toMatchObject({
      statusCode: 401,
    });
    // bcrypt.compare must still run against a dummy hash for unknown
    // usernames — otherwise response time leaks which usernames exist
    // even though the error message is identical (timing side-channel).
    expect(mockedPassword.verifyPassword).toHaveBeenCalledTimes(1);
    expect(mockedAdminRepo.updateLastLogin).not.toHaveBeenCalled();
  });

  it("throws the same generic 401 when the password is wrong (no enumeration)", async () => {
    // Arrange
    mockedAdminRepo.findByUsername.mockResolvedValue(baseAdmin);
    mockedPassword.verifyPassword.mockResolvedValue(false);

    // Act
    const wrongUserError = await authService.loginAdmin("nobody", "x").catch((e) => e);
    mockedAdminRepo.findByUsername.mockResolvedValue(baseAdmin);
    const wrongPasswordError = await authService.loginAdmin("admin1", "x").catch((e) => e);

    // Assert
    expect(wrongPasswordError.message).toBe(wrongUserError.message);
    expect(wrongPasswordError.statusCode).toBe(wrongUserError.statusCode);
    expect(mockedAdminRepo.updateLastLogin).not.toHaveBeenCalled();
  });
});
