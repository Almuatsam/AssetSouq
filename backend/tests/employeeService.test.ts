import { employeeRepository } from "../src/repositories/employeeRepository";
import { employeeService } from "../src/services/employeeService";

jest.mock("../src/repositories/employeeRepository");

const mockedEmployeeRepo = employeeRepository as jest.Mocked<typeof employeeRepository>;

const baseEmployee = {
  id: 1,
  staffNumber: "S1001",
  name: "Jane Doe",
  department: "Engineering",
  email: "jane.doe@example.com",
  active: true,
  laptopHolder: false,
  lastWinnerDate: null,
  eligible: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("employeeService.getById", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the employee when found", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act
    const result = await employeeService.getById(1);

    // Assert
    expect(result).toEqual(baseEmployee);
  });

  it("throws a 404 AppError when the employee doesn't exist", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(employeeService.getById(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("employeeService.listAll", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes the given filters through to the repository", async () => {
    // Arrange
    mockedEmployeeRepo.findAll.mockResolvedValue([baseEmployee] as never);

    // Act
    const result = await employeeService.listAll({ active: true });

    // Assert
    expect(result).toEqual([baseEmployee]);
    expect(mockedEmployeeRepo.findAll).toHaveBeenCalledWith({ active: true });
  });
});

describe("employeeService.createEmployee", () => {
  const createInput = {
    staffNumber: "S1002",
    name: "John Smith",
    department: "Sales",
    email: "john.smith@example.com",
  };

  beforeEach(() => jest.clearAllMocks());

  it("creates the employee when the staff number and email are both unused", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockResolvedValue({ ...baseEmployee, ...createInput } as never);

    // Act
    const result = await employeeService.createEmployee(createInput);

    // Assert
    expect(result.staffNumber).toBe("S1002");
    expect(mockedEmployeeRepo.create).toHaveBeenCalledWith(createInput);
  });

  it("rejects with a 409 when the staff number is already in use", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);

    // Act / Assert
    await expect(employeeService.createEmployee(createInput)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedEmployeeRepo.create).not.toHaveBeenCalled();
  });

  it("rejects with a 409 when the email is already in use", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(baseEmployee as never);

    // Act / Assert
    await expect(employeeService.createEmployee(createInput)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedEmployeeRepo.create).not.toHaveBeenCalled();
  });
});

describe("employeeService.updateEmployee", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates the employee when it exists", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.update.mockResolvedValue({ ...baseEmployee, department: "Finance" } as never);

    // Act
    const result = await employeeService.updateEmployee(1, { department: "Finance" });

    // Assert
    expect(result.department).toBe("Finance");
    expect(mockedEmployeeRepo.update).toHaveBeenCalledWith(1, { department: "Finance" });
  });

  it("rejects with a 404 when the employee doesn't exist", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(employeeService.updateEmployee(999, { department: "Finance" })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockedEmployeeRepo.update).not.toHaveBeenCalled();
  });

  it("allows re-saving the employee's own email unchanged", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.update.mockResolvedValue(baseEmployee as never);

    // Act
    await employeeService.updateEmployee(1, { email: baseEmployee.email, department: "Finance" });

    // Assert
    expect(mockedEmployeeRepo.update).toHaveBeenCalled();
  });

  // Regression: the email column's collation is case-insensitive
  // (utf8mb4_unicode_ci), so a same-employee casing-only edit must not be
  // rejected as a conflict just because the DB lookup (correctly, per its
  // own collation) matches the employee's own row.
  it("allows a casing-only edit to the employee's own email", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.update.mockResolvedValue(baseEmployee as never);

    // Act
    await employeeService.updateEmployee(1, { email: "Jane.Doe@Example.com" });

    // Assert
    expect(mockedEmployeeRepo.update).toHaveBeenCalledWith(1, { email: "Jane.Doe@Example.com" });
  });

  it("rejects with a 409 when changing to an email already used by another employee", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.findByEmail.mockResolvedValue({ ...baseEmployee, id: 2 } as never);

    // Act / Assert
    await expect(
      employeeService.updateEmployee(1, { email: "taken@example.com" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedEmployeeRepo.update).not.toHaveBeenCalled();
  });

  it("allows toggling active/eligible/laptopHolder", async () => {
    // Arrange
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.update.mockResolvedValue({ ...baseEmployee, active: false } as never);

    // Act
    const result = await employeeService.updateEmployee(1, { active: false });

    // Assert
    expect(result.active).toBe(false);
  });
});
