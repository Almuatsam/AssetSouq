import { z } from "zod";

// Query-string booleans arrive as the literal strings "true"/"false", not
// real booleans — z.coerce.boolean() is a trap here (Boolean("false") is
// true), so an explicit two-value enum + transform is required instead of
// silently accepting anything non-empty as true.
const booleanQueryFlag = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "true"));

export const createEmployeeSchema = z.object({
  staffNumber: z.string().trim().min(1, "Staff number is required"),
  name: z.string().trim().min(1, "Name is required"),
  department: z.string().trim().min(1, "Department is required"),
  email: z.string().trim().email("Invalid email address"),
  laptopHolder: z.boolean().optional(),
  eligible: z.boolean().optional(),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

// staffNumber is intentionally excluded — a fixed identifier tied to the
// employee's HR record, not something an admin should silently retarget
// after the fact (same rationale as assetTag on devices). lastWinnerDate
// is also excluded — it's system-managed by the future draw workflow
// (Phase 4), never a manual admin edit.
export const updateEmployeeSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    department: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    active: z.boolean().optional(),
    laptopHolder: z.boolean().optional(),
    eligible: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "At least one field must be provided" });
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const listEmployeesQuerySchema = z.object({
  active: booleanQueryFlag,
  eligible: booleanQueryFlag,
  laptopHolder: booleanQueryFlag,
  department: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
