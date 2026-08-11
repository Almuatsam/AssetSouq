import type { Employee } from "@prisma/client";

import { employeeRepository } from "../repositories/employeeRepository";
import { registrationRepository } from "../repositories/registrationRepository";
import { monthsBetween } from "../utils/dateUtils";

// docs/01-PRD.md: "all eligibility rules must be evaluated together
// against a single employee, not checked independently" — this is the
// one place that happens. Registration (and anything else that gates on
// eligibility) must go through here rather than re-implementing checks.
const WINNER_COOLDOWN_MONTHS = 24;

export interface EligibilityResult {
  eligible: boolean;
  // Human-readable, safe to show the employee directly — no internal
  // details, just which PRD business rule(s) blocked them.
  reasons: string[];
}

// The employee-attribute rules only (1, 3, 4) — no registration lookup.
// Split out from checkEmployee() specifically so the draw engine
// (services/drawService.ts) can re-validate a candidate at draw time
// without checkEmployee's "no other active registration" check (rules 2
// & 5) spuriously firing: at draw time, the candidate's own active
// ELIGIBLE registration for the device being drawn *is* the active
// registration that check would find, so reusing checkEmployee wholesale
// would disqualify every single candidate, every time.
function checkEmployeeAttributes(employee: Employee): EligibilityResult {
  const reasons: string[] = [];

  // Business rule 1: Only Active Employees.
  if (!employee.active) {
    reasons.push("Employee account is not active");
  }
  // Admin-set override (separate from the computed rules below) —
  // lets an admin disable participation for a reason not otherwise
  // captured (docs/04-Backend-Schema.md Employee.eligible).
  if (!employee.eligible) {
    reasons.push("Employee is marked ineligible");
  }
  // Business rule 3: Laptop Holders Cannot Participate.
  if (employee.laptopHolder) {
    reasons.push("Laptop holders cannot participate");
  }
  // Business rule 4: Previous Winners Wait 24 Months.
  if (employee.lastWinnerDate && monthsBetween(employee.lastWinnerDate) < WINNER_COOLDOWN_MONTHS) {
    reasons.push(`Must wait ${WINNER_COOLDOWN_MONTHS} months after a previous win`);
  }

  return { eligible: reasons.length === 0, reasons };
}

export const eligibilityService = {
  checkEmployeeAttributes,

  async checkEmployee(employeeId: number): Promise<EligibilityResult> {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      return { eligible: false, reasons: ["Employee not found"] };
    }

    const reasons = [...checkEmployeeAttributes(employee).reasons];

    // Business rules 2 & 5: One Registration Per Employee / One Device
    // Per Employee — merged into "no other active registration". Note:
    // this is a read-then-write check, not a DB constraint (see
    // schema.prisma), so a race between two simultaneous submissions
    // from the same employee isn't fully closed — acceptable for this
    // phase, worth revisiting if abuse shows up in practice.
    const activeRegistration = await registrationRepository.findActiveByEmployeeId(employeeId);
    if (activeRegistration) {
      reasons.push("Already has an active registration for a device");
    }

    return { eligible: reasons.length === 0, reasons };
  },
};
