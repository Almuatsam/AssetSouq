import { z } from "zod";

export const listWinnersQuerySchema = z.object({
  deviceId: z.coerce.number().int().positive().optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "NON_PAYMENT"]).optional(),
});
export type ListWinnersQuery = z.infer<typeof listWinnersQuerySchema>;
