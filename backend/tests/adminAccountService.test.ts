import { AppError } from "../src/middlewares/errorHandler";
import { adminRepository } from "../src/repositories/adminRepository";
import { adminAccountService } from "../src/services/adminAccountService";
import * as sessionInvalidation from "../src/utils/adminSessionInvalidation";
import * as passwordUtil from "../src/utils/password";

jest.mock("../src/repositories/adminRepository");
jest.mock("../src/utils/password");
jest.mock("../src/utils/adminSessionInvalidation");

const mockedAdminRepo = adminRepository as jest.Mocked<typeof adminRepository>;
const mockedPassword = passwordUtil as jest.Mocked<typeof passwordUtil>;
const mockedInvalidation = sessionInvalidation as jest.Mocked<typeof sessionInvalidation>;

const baseAdmin = {
  id: 1,
  username: "dev_admin",
  passwordHash: "old-hash",
  lastLogin: null,
  credentialsChangedAt: null,
};

const validInput = {
  newUsername: "company_admin",
  newPassword: "CompanyPass123",
  confirmPassword: "CompanyPass123",
};

describe("adminAccountService.changeInitialCredentials", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates the username and hashed password, invalidates sessions, and returns the admin without passwordHash", async () => {
    // Arrange
    mockedAdminRepo.findById
      .mockResolvedValueOnce(baseAdmin)
      .mockResolvedValueOnce({
        ...baseAdmin,
        username: "company_admin",
        passwordHash: "new-hash",
        credentialsChangedAt: new Date("2026-01-01T00:00:00.000Z"),
      });
    mockedAdminRepo.findByUsername.mockResolvedValue(null);
    mockedPassword.hashPassword.mockResolvedValue("new-hash");
    mockedAdminRepo.completeCredentialsHandover.mockResolvedValue(1);

    // Act
    const result = await adminAccountService.changeInitialCredentials(1, validInput);

    // Assert
    expect(mockedPassword.hashPassword).toHaveBeenCalledWith("CompanyPass123");
    expect(mockedAdminRepo.completeCredentialsHandover).toHaveBeenCalledWith(1, {
      username: "company_admin",
      passwordHash: "new-hash",
    });
    expect(mockedInvalidation.invalidateAdminSessions).toHaveBeenCalledWith(1);
    expect(result).toMatchObject({ id: 1, username: "company_admin" });
    expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it("throws 404 when the admin doesn't exist", async () => {
    // Arrange
    mockedAdminRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(adminAccountService.changeInitialCredentials(999, validInput)).rejects.toMatchObject({
      statusCode: 404,
    } satisfies Partial<AppError>);
    expect(mockedAdminRepo.completeCredentialsHandover).not.toHaveBeenCalled();
  });

  it("throws 409 when this admin has already completed the one-time handover", async () => {
    // Arrange
    mockedAdminRepo.findById.mockResolvedValue({
      ...baseAdmin,
      credentialsChangedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    // Act / Assert
    await expect(adminAccountService.changeInitialCredentials(1, validInput)).rejects.toMatchObject({
      statusCode: 409,
    } satisfies Partial<AppError>);
    expect(mockedAdminRepo.completeCredentialsHandover).not.toHaveBeenCalled();
    expect(mockedInvalidation.invalidateAdminSessions).not.toHaveBeenCalled();
  });

  it("throws 409 when the requested new username is already taken by another admin", async () => {
    // Arrange
    mockedAdminRepo.findById.mockResolvedValue(baseAdmin);
    mockedAdminRepo.findByUsername.mockResolvedValue({
      ...baseAdmin,
      id: 2,
      username: "company_admin",
    });

    // Act / Assert
    await expect(adminAccountService.changeInitialCredentials(1, validInput)).rejects.toMatchObject({
      statusCode: 409,
    } satisfies Partial<AppError>);
    expect(mockedAdminRepo.completeCredentialsHandover).not.toHaveBeenCalled();
  });

  it("allows keeping the same username — findByUsername naturally finds the caller's own row, not a collision", async () => {
    // Arrange — findByUsername("dev_admin") legitimately returns the
    // caller's own row here (same id as the id passed to
    // changeInitialCredentials); the uniqueness check must compare by id,
    // not just by existence, or every no-rename submission would 409
    // against itself.
    mockedAdminRepo.findById
      .mockResolvedValueOnce(baseAdmin)
      .mockResolvedValueOnce({ ...baseAdmin, credentialsChangedAt: new Date() });
    mockedAdminRepo.findByUsername.mockResolvedValue(baseAdmin);
    mockedPassword.hashPassword.mockResolvedValue("new-hash");
    mockedAdminRepo.completeCredentialsHandover.mockResolvedValue(1);

    // Act / Assert — does not throw despite findByUsername resolving a row.
    await expect(
      adminAccountService.changeInitialCredentials(1, { ...validInput, newUsername: "dev_admin" }),
    ).resolves.toBeDefined();
    expect(mockedAdminRepo.completeCredentialsHandover).toHaveBeenCalled();
  });

  it("allows a case-only rename of the caller's own username (case-insensitive DB collation would otherwise self-collide)", async () => {
    // Arrange — findByUsername("Dev_Admin") matches the same row
    // case-insensitively (utf8mb4_unicode_ci), same id as the caller.
    mockedAdminRepo.findById
      .mockResolvedValueOnce(baseAdmin)
      .mockResolvedValueOnce({ ...baseAdmin, username: "Dev_Admin", credentialsChangedAt: new Date() });
    mockedAdminRepo.findByUsername.mockResolvedValue(baseAdmin);
    mockedPassword.hashPassword.mockResolvedValue("new-hash");
    mockedAdminRepo.completeCredentialsHandover.mockResolvedValue(1);

    // Act / Assert
    await expect(
      adminAccountService.changeInitialCredentials(1, { ...validInput, newUsername: "Dev_Admin" }),
    ).resolves.toBeDefined();
  });

  it("throws 409 when the conditional update loses a race (already completed by a concurrent request)", async () => {
    // Arrange — the pre-check passed, but completeCredentialsHandover's
    // own WHERE clause found the row no longer eligible by the time it ran.
    mockedAdminRepo.findById.mockResolvedValue(baseAdmin);
    mockedAdminRepo.findByUsername.mockResolvedValue(null);
    mockedPassword.hashPassword.mockResolvedValue("new-hash");
    mockedAdminRepo.completeCredentialsHandover.mockResolvedValue(0);

    // Act / Assert
    await expect(adminAccountService.changeInitialCredentials(1, validInput)).rejects.toMatchObject({
      statusCode: 409,
    } satisfies Partial<AppError>);
    expect(mockedInvalidation.invalidateAdminSessions).not.toHaveBeenCalled();
  });
});
