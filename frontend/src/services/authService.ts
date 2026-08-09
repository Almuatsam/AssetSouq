import { isAxiosError } from "axios";

import { apiClient } from "@/services/apiClient";
import type { AdminSummary, ApiEnvelope, AuthSession, EmployeeSummary } from "@/types/auth";

// Normalizes both network failures and the backend's structured
// { success: false, error } responses into a single Error whose message
// is safe to show the user directly.
function toUserFacingError(err: unknown): Error {
  if (isAxiosError<ApiEnvelope<unknown>>(err)) {
    const message = err.response?.data?.error;
    if (message) return new Error(message);
    if (err.code === "ERR_NETWORK") {
      return new Error("Unable to reach the server. Please check your connection.");
    }
  }
  return new Error("Something went wrong. Please try again.");
}

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
