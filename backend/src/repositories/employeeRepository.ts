import type { Employee } from "@prisma/client";

import { prisma } from "../config/prisma";

export const employeeRepository = {
  findByStaffNumber(staffNumber: string): Promise<Employee | null> {
    return prisma.employee.findUnique({ where: { staffNumber } });
  },

  findById(id: number): Promise<Employee | null> {
    return prisma.employee.findUnique({ where: { id } });
  },
};
