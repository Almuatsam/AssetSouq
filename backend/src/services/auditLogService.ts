import type { AuditLogListFilters, AuditLogWithAdmin } from "../repositories/auditLogRepository";
import { auditLogRepository } from "../repositories/auditLogRepository";

export const auditLogService = {
  // --- Admin-only surface below (routes/adminAuditLogRoutes.ts) ---

  listAll(filters: AuditLogListFilters): Promise<AuditLogWithAdmin[]> {
    return auditLogRepository.findAll(filters);
  },
};
