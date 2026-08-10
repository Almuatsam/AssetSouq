import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { AdminSummary, ApiEnvelope, AuthSession, EmployeeSummary } from "@/types/auth";

export const authService = {
  async loginEmployee(staffNumber: string): Promise<AuthSession> {
    try {
      const res = await apiClient.post<ApiEnvelope<{ token: string; employee: EmployeeSummary }>>(
        "/auth/employee/login",
        { staffNumber },
      );
      const { token, employee } = res.data.data!;
      return { token, user: { role: "EMPLOYEE", employee } };
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  async loginAdmin(username: string, password: string): Promise<AuthSession> {
    try {
      const res = await apiClient.post<ApiEnvelope<{ token: string; admin: AdminSummary }>>(
        "/auth/admin/login",
        { username, password },
      );
      const { token, admin } = res.data.data!;
      return { token, user: { role: "ADMIN", admin } };
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
