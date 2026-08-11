import { z } from "zod";

export const listRegistrationsQuerySchema = z.object({
  status: z.enum(["PENDING", "ELIGIBLE", "INELIGIBLE", "WITHDRAWN"]).optional(),
  deviceId: z.coerce.number().int().positive().optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
});
export type ListRegistrationsQuery = z.infer<typeof listRegistrationsQuerySchema>;

// PENDING is intentionally not a valid admin edit target — it's only ever
// the schema's initial default, and registrationRepository.create()
// already bypasses it by writing ELIGIBLE directly (see registerInterest()
// in services/registrationService.ts), so there's nothing meaningful
// about an admin manually setting a registration "back to pending".
export const updateRegistrationStatusSchema = z.object({
  status: z.enum(["ELIGIBLE", "INELIGIBLE", "WITHDRAWN"]),
});
export type UpdateRegistrationStatusInput = z.infer<typeof updateRegistrationStatusSchema>;
