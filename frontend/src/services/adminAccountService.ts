import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { AdminSummary, ApiEnvelope } from "@/types/auth";

export interface ChangeAdminCredentialsInput {
  newUsername: string;
  newPassword: string;
  confirmPassword: string;
}

export const adminAccountService = {
  // The one-time default-admin-credential handover (see
  // components/AdminCredentialsSetupModal.tsx). Mirrors
  // backend/src/validators/adminAccountValidators.ts's
  // changeAdminCredentialsSchema — no current-password field, since the
  // caller already authenticated with it to reach this screen.
  async changeCredentials(input: ChangeAdminCredentialsInput): Promise<AdminSummary> {
    try {
      const res = await apiClient.patch<ApiEnvelope<{ admin: AdminSummary }>>(
        "/admin/account/credentials",
        input,
      );
      return res.data.data!.admin;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
