import type { AuditLog, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export interface CreateAuditLogData {
  adminId: number;
  action: string;
  entity: string;
  entityId: number;
}

export interface AuditLogListFilters {
  entity?: string;
  adminId?: number;
}

export interface AuditLogWithAdmin extends AuditLog {
  admin: { id: number; username: string } | null;
}

// Caps the admin-facing list endpoint so a growing audit trail can never
// turn one GET into an unbounded table scan/response — this is a live
// operational view of recent activity, not a full-history export (there
// is no such export requirement for AuditLog in docs/01-PRD.md).
const MAX_LIST_ROWS = 500;

export const auditLogRepository = {
  // docs/03-App-Flow.md's "Draw Flow (detail)" step 6: a redraw "logs the
  // redraw as a new AuditLog entry" — the original draw's own audit trail
  // instead lives on the Draw row itself (rngSeed, candidatePoolSnapshot,
  // drawnByAdminId — see drawRepository.ts and the schema.prisma comment
  // on why Draw exists as its own table), but a redraw has no equivalent
  // structured home for "which admin, and why" beyond the new Winner
  // row's redrawReason — this is that record.
  create(data: CreateAuditLogData, db: Db = prisma): Promise<AuditLog> {
    return db.auditLog.create({ data });
  },

  // Admin-only surface (see routes/adminAuditLogRoutes.ts).
  findAll(filters: AuditLogListFilters): Promise<AuditLogWithAdmin[]> {
    return prisma.auditLog.findMany({
      where: { entity: filters.entity, adminId: filters.adminId },
      orderBy: { timestamp: "desc" },
      take: MAX_LIST_ROWS,
      include: { admin: { select: { id: true, username: true } } },
    });
  },
};
