import { z } from "zod";

export const listWinnersQuerySchema = z.object({
  deviceId: z.coerce.number().int().positive().optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "NON_PAYMENT"]).optional(),
});
export type ListWinnersQuery = z.infer<typeof listWinnersQuerySchema>;

// PENDING is intentionally not a valid target here — same rationale as
// registration status (adminRegistrationValidators.ts): it's only ever
// the schema's initial value, never something an admin manually restores
// a winner to after an outcome (paid or not) is actually known.
export const recordPaymentSchema = z.object({
  paymentStatus: z.enum(["PAID", "NON_PAYMENT"]),
  paymentMethod: z.string().trim().min(1).optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
