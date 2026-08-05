import { z } from "zod";

export const employeeLoginSchema = z.object({
  staffNumber: z.string().trim().min(1, "Staff ID is required"),
});
export type EmployeeLoginInput = z.infer<typeof employeeLoginSchema>;

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
