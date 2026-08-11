import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminDeviceFormPage from "@/pages/AdminDeviceFormPage";
import AdminDevicesPage from "@/pages/AdminDevicesPage";
import AdminEmployeeFormPage from "@/pages/AdminEmployeeFormPage";
import AdminEmployeesPage from "@/pages/AdminEmployeesPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminRegistrationsPage from "@/pages/AdminRegistrationsPage";
import AdminWinnersPage from "@/pages/AdminWinnersPage";
import DeviceDetailPage from "@/pages/DeviceDetailPage";
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
        path="/devices/:id"
        element={
          <ProtectedRoute requiredRole="EMPLOYEE" redirectTo="/login">
            <DeviceDetailPage />
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
      <Route
        path="/admin/devices"
        element={
          <ProtectedRoute requiredRole="ADMIN" redirectTo="/admin/login">
            <AdminDevicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/devices/new"
        element={
          <ProtectedRoute requiredRole="ADMIN" redirectTo="/admin/login">
            <AdminDeviceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/devices/:id/edit"
        element={
          <ProtectedRoute requiredRole="ADMIN" redirectTo="/admin/login">
            <AdminDeviceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute requiredRole="ADMIN" redirectTo="/admin/login">
            <AdminEmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees/new"
        element={
          <ProtectedRoute requiredRole="ADMIN" redirectTo="/admin/login">
            <AdminEmployeeFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees/:id/edit"
        element={
          <ProtectedRoute requiredRole="ADMIN" redirectTo="/admin/login">
            <AdminEmployeeFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/registrations"
        element={
          <ProtectedRoute requiredRole="ADMIN" redirectTo="/admin/login">
            <AdminRegistrationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/winners"
        element={
          <ProtectedRoute requiredRole="ADMIN" redirectTo="/admin/login">
            <AdminWinnersPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
