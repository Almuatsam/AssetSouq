import { z } from "zod";

export const runDrawSchema = z.object({
  deviceId: z.coerce.number().int().positive("A device must be selected"),
});
export type RunDrawInput = z.infer<typeof runDrawSchema>;
