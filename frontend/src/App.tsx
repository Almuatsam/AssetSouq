import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import DevicesPage from "@/pages/DevicesPage";
import EmployeeLoginPage from "@/pages/EmployeeLoginPage";
import LandingPage from "@/pages/LandingPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<EmployeeLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route
        path="/devices"
        element={
          <ProtectedRoute requiredRole="EMPLOYEE" redirectTo="/login">
            <DevicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="ADMIN" redirectTo="/admin/login">
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
