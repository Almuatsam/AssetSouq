export interface Employee {
  id: number;
  staffNumber: string;
  name: string;
  department: string;
  email: string;
  active: boolean;
  laptopHolder: boolean;
  lastWinnerDate: string | null;
  eligible: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mirrors backend/src/validators/adminEmployeeValidators.ts's createEmployeeSchema.
export interface CreateEmployeeInput {
  staffNumber: string;
  name: string;
  department: string;
  email: string;
  laptopHolder?: boolean;
  eligible?: boolean;
}

// staffNumber is intentionally excluded — a fixed HR identifier, not
// something an admin should retarget after the fact (same rationale as
// devices' assetTag). lastWinnerDate is also excluded — it's
// system-managed by the future draw workflow (Phase 4), never a manual
// admin edit. `active` IS included (unlike CreateEmployeeInput, which
// never has one on creation — new employees are always created active) —
// it's how the activate/deactivate action on AdminEmployeesPage works.
export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, "staffNumber">> & {
  active?: boolean;
};

export interface EmployeeListFilters {
  active?: boolean;
  eligible?: boolean;
  laptopHolder?: boolean;
  department?: string;
  search?: string;
}
