import { z } from "zod";

// For routes like GET /devices/:id — coerces the route param string to a
// positive integer, matching Prisma's Int autoincrement ids.
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid id"),
});
