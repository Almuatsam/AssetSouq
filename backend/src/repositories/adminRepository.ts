import type { Admin } from "@prisma/client";

import { prisma } from "../config/prisma";

export const adminRepository = {
  findByUsername(username: string): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { username } });
  },

  updateLastLogin(id: number): Promise<Admin> {
    return prisma.admin.update({ where: { id }, data: { lastLogin: new Date() } });
  },
};
