import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/services/apiClient";
import { adminEmployeeService } from "@/services/adminEmployeeService";
import type { Employee } from "@/types/employee";

vi.mock("@/services/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = apiClient.patch as unknown as ReturnType<typeof vi.fn>;

function axiosErrorWith(data: unknown): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    data,
    status: 409,
    statusText: "Conflict",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

const baseEmployee: Employee = {
  id: 1,
  staffNumber: "S1001",
  name: "Jane Doe",
  department: "Engineering",
  email: "jane.doe@example.com",
  active: true,
  laptopHolder: false,
  lastWinnerDate: null,
  eligible: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("adminEmployeeService.listAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists every employee with no filter by default", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { employees: [baseEmployee] } } });

    // Act
    const result = await adminEmployeeService.listAll();

    // Assert
    expect(result).toEqual([baseEmployee]);
    expect(mockedGet).toHaveBeenCalledWith("/admin/employees", { params: undefined });
  });

  it("passes filters as query params", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { employees: [] } } });

    // Act
    await adminEmployeeService.listAll({ active: false, search: "Jane" });

    // Assert
    expect(mockedGet).toHaveBeenCalledWith("/admin/employees", {
      params: { active: false, search: "Jane" },
    });
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminEmployeeService.listAll()).rejects.toThrow(/went wrong/i);
  });
});

describe("adminEmployeeService.getById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches a single employee by id", async () => {
    // Arrange
    mockedGet.mockResolvedValue({ data: { success: true, data: { employee: baseEmployee } } });

    // Act
    const result = await adminEmployeeService.getById(1);

    // Assert
    expect(result).toEqual(baseEmployee);
    expect(mockedGet).toHaveBeenCalledWith("/admin/employees/1");
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedGet.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminEmployeeService.getById(999)).rejects.toThrow(/went wrong/i);
  });
});

describe("adminEmployeeService.create", () => {
  const input = { staffNumber: "S1002", name: "John Smith", department: "Sales", email: "john@example.com" };

  beforeEach(() => vi.clearAllMocks());

  it("creates the employee", async () => {
    // Arrange
    mockedPost.mockResolvedValue({
      data: { success: true, data: { employee: { ...baseEmployee, ...input } } },
    });

    // Act
    const result = await adminEmployeeService.create(input);

    // Assert
    expect(result.staffNumber).toBe("S1002");
    expect(mockedPost).toHaveBeenCalledWith("/admin/employees", input);
  });

  it("surfaces a duplicate-staff-number error from the backend", async () => {
    // Arrange
    mockedPost.mockRejectedValue(
      axiosErrorWith({ success: false, error: "An employee with this staff number already exists" }),
    );

    // Act / Assert
    await expect(adminEmployeeService.create(input)).rejects.toThrow(/already exists/i);
  });
});

describe("adminEmployeeService.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the employee", async () => {
    // Arrange
    mockedPatch.mockResolvedValue({
      data: { success: true, data: { employee: { ...baseEmployee, department: "Finance" } } },
    });

    // Act
    const result = await adminEmployeeService.update(1, { department: "Finance" });

    // Assert
    expect(result.department).toBe("Finance");
    expect(mockedPatch).toHaveBeenCalledWith("/admin/employees/1", { department: "Finance" });
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedPatch.mockRejectedValue(new Error("boom"));

    // Act / Assert
    await expect(adminEmployeeService.update(1, { department: "Finance" })).rejects.toThrow(/went wrong/i);
  });
});

describe("adminEmployeeService.importFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads the file as multipart form data and returns the summary", async () => {
    // Arrange
    mockedPost.mockResolvedValue({
      data: { success: true, data: { summary: { created: 2, updated: 1, errors: [] } } },
    });
    const file = new File(["staff number,name"], "employees.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Act
    const result = await adminEmployeeService.importFile(file);

    // Assert
    expect(result).toEqual({ created: 2, updated: 1, errors: [] });
    expect(mockedPost).toHaveBeenCalledWith("/admin/employees/import", expect.any(FormData));
    const sentFormData = mockedPost.mock.calls[0][1] as FormData;
    expect(sentFormData.get("file")).toBe(file);
  });

  it("normalizes a failed request into a user-facing error", async () => {
    // Arrange
    mockedPost.mockRejectedValue(new Error("boom"));
    const file = new File(["x"], "employees.xlsx");

    // Act / Assert
    await expect(adminEmployeeService.importFile(file)).rejects.toThrow(/went wrong/i);
  });
});
