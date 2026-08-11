import { z } from "zod";

export const runDrawSchema = z.object({
  deviceId: z.coerce.number().int().positive("A device must be selected"),
});
export type RunDrawInput = z.infer<typeof runDrawSchema>;

export const redrawWinnerSchema = z.object({
  reason: z.enum(["DECLINED", "NON_PAYMENT", "NO_SHOW", "ADMIN_OVERRIDE"]),
});
export type RedrawWinnerInput = z.infer<typeof redrawWinnerSchema>;
