import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  entity: z.string().trim().min(1).optional(),
  adminId: z.coerce.number().int().positive().optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
