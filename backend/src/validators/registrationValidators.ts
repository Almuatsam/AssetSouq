import { z } from "zod";

export const createRegistrationSchema = z.object({
  deviceId: z.coerce.number().int().positive("A device must be selected"),
  agreed: z.boolean().refine((v) => v === true, {
    message: "You must agree to the Terms & Conditions",
  }),
});
export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
