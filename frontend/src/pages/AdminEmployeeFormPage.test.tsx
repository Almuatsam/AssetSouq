import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminEmployeeFormPage from "@/pages/AdminEmployeeFormPage";
import { adminEmployeeService } from "@/services/adminEmployeeService";
import { AuthProvider } from "@/store/AuthContext";
import type { Employee } from "@/types/employee";
import i18n from "@/utils/i18n";

vi.mock("@/services/adminEmployeeService");

const mockedAdminEmployeeService = adminEmployeeService as unknown as {
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
};

const existingEmployee: Employee = {
  id: 1,
  staffNumber: "S1001",
  name: "Jane Doe",
  department: "Engineering",
  email: "jane.doe@example.com",
  active: true,
  laptopHolder: false,
  lastWinnerDate: null,
  eligible: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderPage(route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/admin/employees/new" element={<AdminEmployeeFormPage />} />
              <Route path="/admin/employees/:id/edit" element={<AdminEmployeeFormPage />} />
              <Route path="/admin/employees" element={<div>ADMIN_EMPLOYEES_PAGE</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("AdminEmployeeFormPage — create mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders an empty form with an editable staff number field, no active toggle", () => {
    // Act
    renderPage("/admin/employees/new");

    // Assert
    expect(screen.getByRole("heading", { name: /add employee/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/staff number/i)).not.toBeDisabled();
    expect(screen.queryByLabelText(/^active$/i)).not.toBeInTheDocument();
    expect(mockedAdminEmployeeService.getById).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not submit when required fields are empty", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPage("/admin/employees/new");

    // Act
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert
    expect(await screen.findByText(/staff number is required/i)).toBeInTheDocument();
    expect(mockedAdminEmployeeService.create).not.toHaveBeenCalled();
  });

  it("creates the employee and navigates to the employee list on success", async () => {
    // Arrange
    mockedAdminEmployeeService.create.mockResolvedValue({ ...existingEmployee, staffNumber: "S1002" });
    const user = userEvent.setup();
    renderPage("/admin/employees/new");

    // Act
    await user.type(screen.getByLabelText(/staff number/i), "S1002");
    await user.type(screen.getByLabelText(/^name/i), "John Smith");
    await user.type(screen.getByLabelText(/department/i), "Sales");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert
    expect(await screen.findByText("ADMIN_EMPLOYEES_PAGE")).toBeInTheDocument();
    expect(mockedAdminEmployeeService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        staffNumber: "S1002",
        name: "John Smith",
        department: "Sales",
        email: "john@example.com",
        eligible: true,
        laptopHolder: false,
      }),
    );
  });

  it("shows the backend's error (e.g. duplicate staff number) and stays on the page", async () => {
    // Arrange
    mockedAdminEmployeeService.create.mockRejectedValue(
      new Error("An employee with this staff number already exists"),
    );
    const user = userEvent.setup();
    renderPage("/admin/employees/new");

    // Act
    await user.type(screen.getByLabelText(/staff number/i), "S1002");
    await user.type(screen.getByLabelText(/^name/i), "John Smith");
    await user.type(screen.getByLabelText(/department/i), "Sales");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
    expect(screen.queryByText("ADMIN_EMPLOYEES_PAGE")).not.toBeInTheDocument();
  });
});

describe("AdminEmployeeFormPage — edit mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAdminEmployeeService.getById.mockResolvedValue(existingEmployee);
  });

  it("pre-fills the form from the existing employee and disables the staff number field", async () => {
    // Act
    renderPage("/admin/employees/1/edit");

    // Assert
    expect(await screen.findByDisplayValue("Jane Doe")).toBeInTheDocument();
    expect(screen.getByLabelText(/staff number/i)).toHaveValue("S1001");
    expect(screen.getByLabelText(/staff number/i)).toBeDisabled();
    expect(screen.getByLabelText(/^active$/i)).toBeChecked();
    expect(mockedAdminEmployeeService.getById).toHaveBeenCalledWith(1);
  });

  it("shows an error message when the employee fails to load", async () => {
    // Arrange
    mockedAdminEmployeeService.getById.mockRejectedValue(new Error("not found"));

    // Act
    renderPage("/admin/employees/1/edit");

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load this employee/i);
  });

  it("shows an error message instead of a blank form for a non-numeric :id in the URL", () => {
    // Act
    renderPage("/admin/employees/not-a-number/edit");

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load this employee/i);
    expect(mockedAdminEmployeeService.getById).not.toHaveBeenCalled();
  });

  it("updates the employee (without staffNumber) and navigates to the employee list on success", async () => {
    // Arrange
    mockedAdminEmployeeService.update.mockResolvedValue({ ...existingEmployee, department: "Finance" });
    const user = userEvent.setup();
    renderPage("/admin/employees/1/edit");
    await screen.findByDisplayValue("Jane Doe");

    // Act
    const departmentField = screen.getByLabelText(/department/i);
    await user.clear(departmentField);
    await user.type(departmentField, "Finance");
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert
    expect(await screen.findByText("ADMIN_EMPLOYEES_PAGE")).toBeInTheDocument();
    expect(mockedAdminEmployeeService.update).toHaveBeenCalledWith(
      1,
      expect.not.objectContaining({ staffNumber: expect.anything() }),
    );
    expect(mockedAdminEmployeeService.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ department: "Finance", active: true }),
    );
  });

  it("deactivates the employee via the active checkbox", async () => {
    // Arrange
    mockedAdminEmployeeService.update.mockResolvedValue({ ...existingEmployee, active: false });
    const user = userEvent.setup();
    renderPage("/admin/employees/1/edit");
    await screen.findByDisplayValue("Jane Doe");

    // Act
    await user.click(screen.getByLabelText(/^active$/i));
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Assert
    expect(mockedAdminEmployeeService.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ active: false }),
    );
  });
});
