import { AppError } from "../middlewares/errorHandler";
import { adminRepository } from "../repositories/adminRepository";
import { employeeRepository } from "../repositories/employeeRepository";
import { signToken } from "../utils/jwt";
import { verifyPassword } from "../utils/password";

// Deliberately identical for "not found" and "found but not allowed to log
// in" cases, on both flows below — never leak which half of that was true
// (staff ID / username enumeration).
const INVALID_STAFF_ID = "Invalid staff ID";
const INVALID_ADMIN_CREDENTIALS = "Invalid username or password";

// A precomputed bcrypt hash of an arbitrary, unknown string (not a real
// admin's password). Used only to give unknown-username login attempts a
// hash to compare against, so bcrypt.compare always runs and takes
// roughly the same time whether or not the username exists — otherwise
// the identical error message above is undermined by a timing
// side-channel that still lets an attacker enumerate valid usernames.
const DUMMY_PASSWORD_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8U1qHIEEIiXVs1gEbA3z7uKAOw9jaW";

export const authService = {
  // Employee identity is proven by staff ID alone per the PRD ("Login using
  // Staff ID"); no password is collected for employees in this phase. This
  // is intentionally minimal for the MVP — see docs/02-TDD.md's note on
  // future Microsoft Entra ID (Azure AD) sign-in — and the endpoint is rate
  // limited (see middlewares/rateLimit.ts) to blunt brute-force staff ID
  // guessing in the meantime.
  async loginEmployee(staffNumber: string) {
    const employee = await employeeRepository.findByStaffNumber(staffNumber);
    if (!employee || !employee.active) {
      throw new AppError(401, INVALID_STAFF_ID);
    }

    const token = signToken({
      role: "EMPLOYEE",
      id: employee.id,
      staffNumber: employee.staffNumber,
    });

    return { token, employee };
  },

  async loginAdmin(username: string, password: string) {
    const admin = await adminRepository.findByUsername(username);

    // Always run bcrypt.compare, against the real hash if the admin
    // exists or a dummy one if not, so response time doesn't reveal
    // which case it was (see DUMMY_PASSWORD_HASH above).
    const isValidPassword = await verifyPassword(
      password,
      admin?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!admin || !isValidPassword) {
      throw new AppError(401, INVALID_ADMIN_CREDENTIALS);
    }

    const updated = await adminRepository.updateLastLogin(admin.id);

    const token = signToken({ role: "ADMIN", id: admin.id, username: admin.username });

    const { passwordHash: _passwordHash, ...safeAdmin } = updated;
    return { token, admin: safeAdmin };
  },
};
