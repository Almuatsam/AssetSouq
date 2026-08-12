import { useQuery } from "@tanstack/react-query";

import { adminAuditLogService } from "@/services/adminAuditLogService";
import type { AuditLogListFilters } from "@/types/auditLog";

const ADMIN_AUDIT_LOGS_QUERY_KEY = ["admin", "auditLogs"] as const;

export function useAdminAuditLogs(filters?: AuditLogListFilters) {
  return useQuery({
    queryKey: [...ADMIN_AUDIT_LOGS_QUERY_KEY, filters ?? {}],
    queryFn: () => adminAuditLogService.listAll(filters),
  });
}
