import { useQuery } from "@tanstack/react-query";

import { registrationService } from "@/services/registrationService";

export const MY_REGISTRATION_QUERY_KEY = ["registrations", "me"] as const;

export function useMyRegistration() {
  return useQuery({ queryKey: MY_REGISTRATION_QUERY_KEY, queryFn: registrationService.getMine });
}
