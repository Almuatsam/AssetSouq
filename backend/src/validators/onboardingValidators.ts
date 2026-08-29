import { z } from "zod";

// "start"/"restart"/"complete"/"skip" are handled entirely server-side
// (see onboardingService.ts) — the client only ever says *which* action
// happened, never sends a timestamp itself, so a client can't forge
// tourCompletedAt/tourSkippedAt.
export const updateOnboardingSchema = z
  .object({
    action: z.enum(["start", "restart", "complete", "skip"]).optional(),
    currentStepId: z.string().max(191).nullable().optional(),
    tourVersion: z.number().int().positive().optional(),
    whatsNewSeenVersion: z.number().int().positive().optional(),
    checklist: z
      .object({
        dismissed: z.boolean().optional(),
        items: z.record(z.string(), z.boolean()).optional(),
      })
      .optional(),
  })
  .strict();
export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>;
