import { AppError } from "../middlewares/errorHandler";
import { adminRepository } from "../repositories/adminRepository";
import { invalidateAdminSessions } from "../utils/adminSessionInvalidation";
import { hashPassword } from "../utils/password";
import type { ChangeAdminCredentialsInput } from "../validators/adminAccountValidators";

const ALREADY_COMPLETED_MESSAGE = "The one-time admin credential setup has already been completed";

export const adminAccountService = {
  // The one-time default-admin-credential handover: lets an admin still
  // on the seeded/default username+password replace both, exactly once,
  // ever. Never collects the current password — the caller already
  // authenticated via authenticate() + requireRole("ADMIN") to reach this
  // point (see routes/adminAccountRoutes.ts).
  async changeInitialCredentials(adminId: number, input: ChangeAdminCredentialsInput) {
    const admin = await adminRepository.findById(adminId);
    if (!admin) {
      throw new AppError(404, "Admin not found");
    }

    // The backend, not the frontend, is the source of truth for "has this
    // already happened" — reject here even if a caller reaches this
    // endpoint directly (bypassing a frontend that would otherwise hide
    // or disable the button once complete).
    if (admin.credentialsChangedAt) {
      throw new AppError(409, ALREADY_COMPLETED_MESSAGE);
    }

    // Compares by id, not by the raw string, against admin.username — the
    // DB collation (utf8mb4_unicode_ci) matches usernames case-
    // insensitively, so a caller merely changing the case of their own
    // current username (e.g. "dev_admin" -> "Dev_Admin") would otherwise
    // find their own row via findByUsername and get incorrectly rejected
    // as "already in use" by a naive equality/existence check.
    const existing = await adminRepository.findByUsername(input.newUsername);
    if (existing && existing.id !== adminId) {
      throw new AppError(409, "That username is already in use");
    }

    const passwordHash = await hashPassword(input.newPassword);

    // Atomic conditional update — see adminRepository.completeCredentialsHandover's
    // own comment. changed === 0 means another request completed the
    // handover between the check above and this write (a genuine race,
    // e.g. a double-submitted form), not a bug; treat it the same as
    // "already completed".
    const changed = await adminRepository.completeCredentialsHandover(adminId, {
      username: input.newUsername,
      passwordHash,
    });
    if (changed === 0) {
      throw new AppError(409, ALREADY_COMPLETED_MESSAGE);
    }

    // Any bearer token issued for this admin before this moment — most
    // immediately, whatever token the browser used to authenticate *this
    // very request* — must stop working from here on. The frontend also
    // clears its own copy and forces a fresh login on success; this is
    // the backend-enforced half of that (see
    // utils/adminSessionInvalidation.ts for why this is real enforcement
    // and not just a client-side convention).
    invalidateAdminSessions(adminId);

    const updated = await adminRepository.findById(adminId);
    if (!updated) {
      // Unreachable in practice (the row we just updated can't vanish
      // between the write and this read within the same request), but
      // keeps the return type honest rather than asserting non-null.
      throw new AppError(404, "Admin not found");
    }

    const { passwordHash: _passwordHash, ...safeAdmin } = updated;
    return safeAdmin;
  },
};
