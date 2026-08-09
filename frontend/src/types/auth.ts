export type AuthRole = "EMPLOYEE" | "ADMIN";

export interface EmployeeSummary {
  id: number;
  staffNumber: string;
  name: string;
  department: string;
  email: string;
  active: boolean;
}

export interface AdminSummary {
  id: number;
  username: string;
  lastLogin: string | null;
}

export type AuthUser =
  | { role: "EMPLOYEE"; employee: EmployeeSummary }
  | { role: "ADMIN"; admin: AdminSummary };

export interface AuthSession {
  token: string;
  user: AuthUser;
}

// Matches the backend's { success, data, error } response envelope
// (backend/src/middlewares/errorHandler.ts).
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}
