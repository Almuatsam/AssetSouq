import { z } from "zod";

// No password policy is defined anywhere else in the codebase yet —
// prisma/seed.ts's bootstrap-admin check only enforces a length floor
// (12 chars). This is the first real policy; reuse this schema for any
// future admin password flow (e.g. a general "change my password"
// feature) rather than inventing a second one.
const MIN_PASSWORD_LENGTH = 12;
// bcrypt (utils/password.ts) silently truncates any input past 72 bytes
// rather than throwing — this is the first password-*setting* surface in
// the app (authValidators.ts's login password only ever feeds
// bcrypt.compare, where truncation is comparatively harmless), so cap
// input length here to match what's actually enforced at the hashing
// layer, rather than silently accepting a longer password than the one
// that actually gets checked on future logins.
const MAX_PASSWORD_LENGTH = 72;

export const adminPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

// Matches the Admin.username column's VARCHAR(191) width (prisma/schema.prisma
// has no @db.VarChar override, so Prisma's MySQL default applies) — same
// reasoning as onboardingValidators.ts's currentStepId.max(191). Without
// this, an over-length username passes Zod and fails at the DB layer
// instead, as an unhandled "Data too long for column" 500 rather than a
// clean 400.
const MAX_USERNAME_LENGTH = 191;

// The one-time admin credential handover (services/adminAccountService.ts).
// Deliberately does not collect the current password — the caller already
// authenticated with it to reach this endpoint (authenticate() +
// requireRole("ADMIN") both run first), matching the feature spec.
export const changeAdminCredentialsSchema = z
  .object({
    newUsername: z
      .string()
      .trim()
      .min(1, "Username is required")
      .max(MAX_USERNAME_LENGTH, `Username must be at most ${MAX_USERNAME_LENGTH} characters`),
    newPassword: adminPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangeAdminCredentialsInput = z.infer<typeof changeAdminCredentialsSchema>;
