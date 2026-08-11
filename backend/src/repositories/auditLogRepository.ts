import type { AuditLog, Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export interface CreateAuditLogData {
  adminId: number;
  action: string;
  entity: string;
  entityId: number;
}

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
};
