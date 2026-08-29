import type { OnboardingProgress, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

const EMPTY_CHECKLIST = {};

export const onboardingRepository = {
  findByEmployeeId(employeeId: number): Promise<OnboardingProgress | null> {
    return prisma.onboardingProgress.findUnique({ where: { employeeId } });
  },

  findByAdminId(adminId: number): Promise<OnboardingProgress | null> {
    return prisma.onboardingProgress.findUnique({ where: { adminId } });
  },

  createForEmployee(employeeId: number): Promise<OnboardingProgress> {
    return prisma.onboardingProgress.create({
      data: { employeeId, checklist: EMPTY_CHECKLIST },
    });
  },

  createForAdmin(adminId: number): Promise<OnboardingProgress> {
    return prisma.onboardingProgress.create({
      data: { adminId, checklist: EMPTY_CHECKLIST },
    });
  },

  update(id: number, data: Prisma.OnboardingProgressUpdateInput): Promise<OnboardingProgress> {
    return prisma.onboardingProgress.update({ where: { id }, data });
  },
};
