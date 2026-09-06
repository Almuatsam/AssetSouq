import type { Admin } from "@prisma/client";

import { prisma } from "../config/prisma";

export const adminRepository = {
  findByUsername(username: string): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { username } });
  },

  findById(id: number): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { id } });
  },

  updateLastLogin(id: number): Promise<Admin> {
    return prisma.admin.update({ where: { id }, data: { lastLogin: new Date() } });
  },

  // Atomic, conditional update for the one-time credential handover
  // (services/adminAccountService.ts) — the WHERE clause re-checks
  // credentialsChangedAt is still null at the moment of the write, so two
  // concurrent requests for the same admin (a double-submit, or a direct
  // API replay racing the first legitimate call) can't both "win": at
  // most one updateMany() call ever matches a row. Returns the count of
  // rows actually changed (0 or 1, since id is unique) rather than the
  // row itself — updateMany() doesn't return it — so callers re-fetch via
  // findById() only after confirming count === 1.
  async completeCredentialsHandover(
    id: number,
    data: { username: string; passwordHash: string },
  ): Promise<number> {
    const result = await prisma.admin.updateMany({
      where: { id, credentialsChangedAt: null },
      data: { ...data, credentialsChangedAt: new Date() },
    });
    return result.count;
  },
};
