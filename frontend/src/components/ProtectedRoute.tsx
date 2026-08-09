import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "@/store/AuthContext";
import type { AuthRole } from "@/types/auth";

interface ProtectedRouteProps {
  // Named requiredRole (not `role`) so jsx-a11y's aria-role rule doesn't
  // mistake this prop for the HTML `role` attribute at call sites.
  requiredRole: AuthRole;
  redirectTo: string;
  children: ReactNode;
}

// Guards a route to a signed-in user of the given role. Unauthenticated or
// wrong-role visitors are bounced to `redirectTo` (that role's login page)
// rather than shown a generic 403 — matches the PRD's two-portal flow.
export function ProtectedRoute({ requiredRole, redirectTo, children }: ProtectedRouteProps) {
  const { session } = useAuth();

  if (!session || session.user.role !== requiredRole) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
