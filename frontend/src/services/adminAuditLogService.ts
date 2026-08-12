import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type { AuditLog, AuditLogListFilters } from "@/types/auditLog";

export const adminAuditLogService = {
  async listAll(filters?: AuditLogListFilters): Promise<AuditLog[]> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ auditLogs: AuditLog[] }>>("/admin/audit-logs", {
        params: filters,
      });
      return res.data.data!.auditLogs;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
