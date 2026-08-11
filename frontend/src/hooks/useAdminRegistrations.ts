import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MY_REGISTRATION_QUERY_KEY } from "@/hooks/useMyRegistration";
import { adminRegistrationService } from "@/services/adminRegistrationService";
import type { RegistrationListFilters, RegistrationStatus } from "@/types/device";

const ADMIN_REGISTRATIONS_QUERY_KEY = ["admin", "registrations"] as const;

export function useAdminRegistrations(filters?: RegistrationListFilters) {
  return useQuery({
    queryKey: [...ADMIN_REGISTRATIONS_QUERY_KEY, filters ?? {}],
    queryFn: () => adminRegistrationService.listAll(filters),
  });
}

export function useUpdateRegistrationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: RegistrationStatus }) =>
      adminRegistrationService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REGISTRATIONS_QUERY_KEY });
      // An admin-driven status change (mark ineligible, withdraw, etc.)
      // changes what the affected employee's own "my registration" view
      // (useMyRegistration, cached under MY_REGISTRATION_QUERY_KEY) should
      // show — without this, that employee keeps seeing their stale
      // pre-change status until an unrelated remount. Same cross-cache
      // invalidation need as useRegisterInterest's own mutation.
      queryClient.invalidateQueries({ queryKey: MY_REGISTRATION_QUERY_KEY });
    },
  });
}
