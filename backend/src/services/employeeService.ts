import type { Employee } from "@prisma/client";

import type { EmployeeListFilters } from "../repositories/employeeRepository";
import { employeeRepository } from "../repositories/employeeRepository";
import { AppError } from "../middlewares/errorHandler";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "../validators/adminEmployeeValidators";

export const employeeService = {
  // --- Admin-only surface below (routes/adminEmployeeRoutes.ts) ---

  listAll(filters: EmployeeListFilters): Promise<Employee[]> {
    return employeeRepository.findAll(filters);
  },

  // Employees have no public-facing single-record endpoint to reuse the
  // way admin device edit reuses GET /devices/:id — this exists so the
  // admin edit form can prefill correctly on a direct/bookmarked/refreshed
  // navigation, not just when arriving from an already-loaded list.
  async getById(id: number): Promise<Employee> {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new AppError(404, "Employee not found");
    }
    return employee;
  },

  async createEmployee(data: CreateEmployeeInput): Promise<Employee> {
    const [staffNumberTaken, emailTaken] = await Promise.all([
      employeeRepository.findByStaffNumber(data.staffNumber),
      employeeRepository.findByEmail(data.email),
    ]);
    if (staffNumberTaken) {
      throw new AppError(409, "An employee with this staff number already exists");
    }
    if (emailTaken) {
      throw new AppError(409, "An employee with this email already exists");
    }
    return employeeRepository.create(data);
  },

  async updateEmployee(id: number, data: UpdateEmployeeInput): Promise<Employee> {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new AppError(404, "Employee not found");
    }

    if (data.email) {
      // Compare by id, not by string equality against employee.email — the
      // email column's collation (utf8mb4_unicode_ci) is case-insensitive,
      // so a plain `!==` check would treat a same-employee casing-only edit
      // (e.g. "Jane.Doe@x.com" -> "jane.doe@x.com") as a change, look it up,
      // find the employee's own row via the case-insensitive unique index,
      // and incorrectly reject it as a conflict. Excluding by id sidesteps
      // reasoning about collation entirely: only a genuinely different
      // employee's row can trigger the 409.
      const emailTaken = await employeeRepository.findByEmail(data.email);
      if (emailTaken && emailTaken.id !== id) {
        throw new AppError(409, "An employee with this email already exists");
      }
    }

    return employeeRepository.update(id, data);
  },
};
