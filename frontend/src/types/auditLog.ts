// Mirrors backend GET /admin/audit-logs's AuditLogWithAdmin.
export interface AuditLog {
  id: number;
  adminId: number | null;
  action: string;
  entity: string;
  entityId: number;
  timestamp: string;
  admin: { id: number; username: string } | null;
}

// Mirrors backend/src/validators/adminAuditLogValidators.ts's listAuditLogsQuerySchema.
export interface AuditLogListFilters {
  entity?: string;
  adminId?: number;
}
