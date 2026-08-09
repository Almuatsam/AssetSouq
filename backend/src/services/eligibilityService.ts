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

export const eligibilityService = {
  async checkEmployee(employeeId: number): Promise<EligibilityResult> {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      return { eligible: false, reasons: ["Employee not found"] };
    }

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
