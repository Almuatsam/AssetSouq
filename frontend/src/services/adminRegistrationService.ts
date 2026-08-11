import { apiClient } from "@/services/apiClient";
import { toUserFacingError } from "@/services/apiError";
import type { ApiEnvelope } from "@/types/auth";
import type {
  AdminRegistrationRow,
  Registration,
  RegistrationListFilters,
  RegistrationStatus,
} from "@/types/device";

export const adminRegistrationService = {
  async listAll(filters?: RegistrationListFilters): Promise<AdminRegistrationRow[]> {
    try {
      const res = await apiClient.get<ApiEnvelope<{ registrations: AdminRegistrationRow[] }>>(
        "/admin/registrations",
        { params: filters },
      );
      return res.data.data!.registrations;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },

  // Returns the plain (non-joined) Registration — the backend's PATCH
  // response isn't re-fetched with the employee/device include, only the
  // updated row itself. The list re-fetches via cache invalidation, so
  // callers never need the joined shape from this response directly.
  async updateStatus(id: number, status: RegistrationStatus): Promise<Registration> {
    try {
      const res = await apiClient.patch<ApiEnvelope<{ registration: Registration }>>(
        `/admin/registrations/${id}`,
        { status },
      );
      return res.data.data!.registration;
    } catch (err) {
      throw toUserFacingError(err);
    }
  },
};
