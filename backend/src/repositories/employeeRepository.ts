import type { Employee, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

export type CreateEmployeeData = Omit<Prisma.EmployeeCreateInput, "createdAt" | "updatedAt">;
export type UpdateEmployeeData = Partial<
  Omit<Prisma.EmployeeUpdateInput, "staffNumber" | "createdAt" | "updatedAt">
>;

export interface EmployeeListFilters {
  active?: boolean;
  eligible?: boolean;
  laptopHolder?: boolean;
  department?: string;
  search?: string;
}

export const employeeRepository = {
  findByStaffNumber(staffNumber: string): Promise<Employee | null> {
    return prisma.employee.findUnique({ where: { staffNumber } });
  },

  findById(id: number): Promise<Employee | null> {
    return prisma.employee.findUnique({ where: { id } });
  },

  // Admin-only surface (see routes/adminEmployeeRoutes.ts).

  findByEmail(email: string): Promise<Employee | null> {
    return prisma.employee.findUnique({ where: { email } });
  },

  findAll(filters: EmployeeListFilters): Promise<Employee[]> {
    return prisma.employee.findMany({
      where: {
        active: filters.active,
        eligible: filters.eligible,
        laptopHolder: filters.laptopHolder,
        department: filters.department,
        // Prisma ignores an `undefined` OR entirely, so this only narrows
        // the query when a search term was actually given.
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search } },
                { staffNumber: { contains: filters.search } },
                { email: { contains: filters.search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  create(data: CreateEmployeeData): Promise<Employee> {
    return prisma.employee.create({ data });
  },

  update(id: number, data: UpdateEmployeeData): Promise<Employee> {
    return prisma.employee.update({ where: { id }, data });
  },
};
