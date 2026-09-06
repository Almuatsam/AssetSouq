import { useMutation } from "@tanstack/react-query";

import { adminAccountService } from "@/services/adminAccountService";
import type { ChangeAdminCredentialsInput } from "@/services/adminAccountService";

// No cache to invalidate on success (unlike hooks/useAdminWinners.ts etc.)
// — the caller (components/AdminCredentialsSetupModal.tsx) responds to a
// successful change by logging the admin out and sending them back to
// the login screen, not by re-rendering the current session's data.
export function useChangeAdminCredentials() {
  return useMutation({
    mutationFn: (input: ChangeAdminCredentialsInput) => adminAccountService.changeCredentials(input),
  });
}
