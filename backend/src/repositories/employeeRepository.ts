import type { Employee, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

export type CreateEmployeeData = Omit<Prisma.EmployeeCreateInput, "createdAt" | "updatedAt">;
export type UpdateEmployeeData = Partial<
  Omit<Prisma.EmployeeUpdateInput, "staffNumber" | "createdAt" | "updatedAt">
>;

// See deviceRepository.ts's identical Db type for the rationale — the
// draw engine's markAsWinner() must commit atomically with the Draw/
// Winner rows it's created alongside (services/drawService.ts).
type Db = typeof prisma | Prisma.TransactionClient;

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

  // Admin dashboard stats (see services/dashboardService.ts). "eligible"
  // here means currently raffle-eligible in practice — active AND
  // eligible — not just the raw `eligible` column, which stays true for
  // deactivated employees until someone updates it.
  async countStats(): Promise<{ total: number; active: number; eligible: number }> {
    const [total, active, eligible] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { active: true } }),
      prisma.employee.count({ where: { active: true, eligible: true } }),
    ]);
    return { total, active, eligible };
  },

  // Draw engine (Phase 4, see services/drawService.ts) — deliberately
  // separate from update() (which explicitly excludes lastWinnerDate, see
  // UpdateEmployeeData/adminEmployeeValidators.ts) since this is
  // system-managed by a winning draw, never a direct admin edit.
  markAsWinner(employeeId: number, db: Db = prisma): Promise<Employee> {
    return db.employee.update({ where: { id: employeeId }, data: { lastWinnerDate: new Date() } });
  },
};
