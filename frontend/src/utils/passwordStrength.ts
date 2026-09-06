export type PasswordStrength = "empty" | "weak" | "fair" | "strong";

// Deliberately a superset of the backend's actual policy (12+ chars,
// upper, lower, number — see backend/src/validators/adminAccountValidators.ts's
// adminPasswordSchema) rather than a copy of it: this only drives the
// visual meter (components/ui/PasswordStrengthMeter.tsx), so it's fine
// (better, even) for it to reward extra length and symbols beyond what's
// strictly required. The backend remains the real source of truth for
// what's actually accepted.
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "empty";

  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return "weak";
  if (score <= 4) return "fair";
  return "strong";
}
