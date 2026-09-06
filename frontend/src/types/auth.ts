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
  // Null until this admin completes the one-time default-credential
  // handover (see components/AdminCredentialsSetupModal.tsx); non-null
  // forever after. Refreshed only by logging in again — this session
  // snapshot is not re-fetched on every page load, matching how the rest
  // of AuthSession already works (see store/AuthContext.tsx).
  credentialsChangedAt: string | null;
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
