import request from "supertest";

import { createApp } from "../src/app";
import { AppError } from "../src/middlewares/errorHandler";
import { employeeService } from "../src/services/employeeService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/employeeService");

const mockedEmployeeService = employeeService as jest.Mocked<typeof employeeService>;

const app = createApp();

const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });
const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

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

describe("GET /api/admin/employees", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/admin/employees");

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees (admin-only route)", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/employees")
      .set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(403);
  });

  it("returns every employee for an authenticated admin", async () => {
    // Arrange
    mockedEmployeeService.listAll.mockResolvedValue([baseEmployee] as never);

    // Act
    const res = await request(app)
      .get("/api/admin/employees")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.employees).toHaveLength(1);
    expect(mockedEmployeeService.listAll).toHaveBeenCalledWith({});
  });

  it("passes filters through to the service", async () => {
    // Arrange
    mockedEmployeeService.listAll.mockResolvedValue([]);

    // Act
    const res = await request(app)
      .get("/api/admin/employees?active=false&search=Jane")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(mockedEmployeeService.listAll).toHaveBeenCalledWith({ active: false, search: "Jane" });
  });

  it("returns 400 for an invalid boolean filter", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/employees?active=maybe")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(400);
    expect(mockedEmployeeService.listAll).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/employees", () => {
  const validPayload = {
    staffNumber: "S1002",
    name: "John Smith",
    department: "Sales",
    email: "john.smith@example.com",
  };

  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).post("/api/admin/employees").send(validPayload);

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees", async () => {
    // Act
    const res = await request(app)
      .post("/api/admin/employees")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(403);
  });

  it("creates the employee for an authenticated admin", async () => {
    // Arrange
    mockedEmployeeService.createEmployee.mockResolvedValue({ ...baseEmployee, ...validPayload } as never);

    // Act
    const res = await request(app)
      .post("/api/admin/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.data.employee.staffNumber).toBe("S1002");
  });

  it("returns 400 for an invalid payload (validation, before the service is called)", async () => {
    // Act
    const res = await request(app)
      .post("/api/admin/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validPayload, email: "not-an-email" });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedEmployeeService.createEmployee).not.toHaveBeenCalled();
  });

  it("returns 409 when the staff number is already in use", async () => {
    // Arrange
    mockedEmployeeService.createEmployee.mockRejectedValue(
      new AppError(409, "An employee with this staff number already exists"),
    );

    // Act
    const res = await request(app)
      .post("/api/admin/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validPayload);

    // Assert
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/admin/employees/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).patch("/api/admin/employees/1").send({ active: false });

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/employees/1")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ active: false });

    // Assert
    expect(res.status).toBe(403);
  });

  it("updates the employee for an authenticated admin", async () => {
    // Arrange
    mockedEmployeeService.updateEmployee.mockResolvedValue({ ...baseEmployee, active: false } as never);

    // Act
    const res = await request(app)
      .patch("/api/admin/employees/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ active: false });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.employee.active).toBe(false);
    expect(mockedEmployeeService.updateEmployee).toHaveBeenCalledWith(1, { active: false });
  });

  it("returns 400 for an empty update body", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/employees/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    // Assert
    expect(res.status).toBe(400);
    expect(mockedEmployeeService.updateEmployee).not.toHaveBeenCalled();
  });

  it("returns 404 when the employee doesn't exist", async () => {
    // Arrange
    mockedEmployeeService.updateEmployee.mockRejectedValue(new AppError(404, "Employee not found"));

    // Act
    const res = await request(app)
      .patch("/api/admin/employees/999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ active: false });

    // Assert
    expect(res.status).toBe(404);
  });

  it("returns 409 when changing to an email already in use", async () => {
    // Arrange
    mockedEmployeeService.updateEmployee.mockRejectedValue(
      new AppError(409, "An employee with this email already exists"),
    );

    // Act
    const res = await request(app)
      .patch("/api/admin/employees/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "taken@example.com" });

    // Assert
    expect(res.status).toBe(409);
  });
});
