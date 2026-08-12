import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminEmployeesPage from "@/pages/AdminEmployeesPage";
import { adminEmployeeService } from "@/services/adminEmployeeService";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { Employee } from "@/types/employee";
import { setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/adminEmployeeService");

const mockedAdminEmployeeService = adminEmployeeService as unknown as {
  listAll: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  importFile: ReturnType<typeof vi.fn>;
};

const adminSession = {
  token: "tok",
  user: { role: "ADMIN" as const, admin: { id: 1, username: "admin1", lastLogin: null } },
};

const activeEmployee: Employee = {
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

const inactiveEmployee: Employee = { ...activeEmployee, id: 2, staffNumber: "S1002", active: false };

describe("AdminEmployeesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setStoredSession(adminSession);
    mockedAdminEmployeeService.listAll.mockResolvedValue([]);
  });

  it("lists employees with their department and status", async () => {
    // Arrange
    mockedAdminEmployeeService.listAll.mockResolvedValue([activeEmployee]);

    // Act
    renderWithProviders(<AdminEmployeesPage />);

    // Assert
    expect(await screen.findByText("S1001")).toBeInTheDocument();
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("Engineering")).toBeInTheDocument();
    expect(within(row).getByText(/^active$/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no employees", async () => {
    // Act
    renderWithProviders(<AdminEmployeesPage />);

    // Assert
    expect(await screen.findByText(/no employees found/i)).toBeInTheDocument();
  });

  it("shows an error message when the list fails to load", async () => {
    // Arrange
    mockedAdminEmployeeService.listAll.mockRejectedValue(new Error("network down"));

    // Act
    renderWithProviders(<AdminEmployeesPage />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load employees/i);
  });

  it("re-queries with an active filter when one is selected", async () => {
    // Arrange
    mockedAdminEmployeeService.listAll.mockResolvedValue([activeEmployee]);
    const user = userEvent.setup();
    renderWithProviders(<AdminEmployeesPage />);
    await screen.findByText("S1001");

    // Act
    await user.selectOptions(screen.getByLabelText(/status/i), "false");

    // Assert
    await waitFor(() =>
      expect(mockedAdminEmployeeService.listAll).toHaveBeenCalledWith(
        expect.objectContaining({ active: false }),
      ),
    );
  });

  it("re-queries with a search term", async () => {
    // Arrange
    mockedAdminEmployeeService.listAll.mockResolvedValue([activeEmployee]);
    const user = userEvent.setup();
    renderWithProviders(<AdminEmployeesPage />);
    await screen.findByText("S1001");

    // Act
    await user.type(screen.getByLabelText(/search/i), "Jane");

    // Assert
    await waitFor(() =>
      expect(mockedAdminEmployeeService.listAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Jane" }),
      ),
    );
  });

  it("links to the add-employee and edit pages", async () => {
    // Arrange
    mockedAdminEmployeeService.listAll.mockResolvedValue([activeEmployee]);

    // Act
    renderWithProviders(<AdminEmployeesPage />);
    await screen.findByText("S1001");

    // Assert
    expect(screen.getByRole("link", { name: /add employee/i })).toHaveAttribute(
      "href",
      "/admin/employees/new",
    );
    expect(screen.getByRole("link", { name: /edit/i })).toHaveAttribute(
      "href",
      "/admin/employees/1/edit",
    );
  });

  it("offers Deactivate for an active employee and Activate for an inactive one", async () => {
    // Arrange
    mockedAdminEmployeeService.listAll.mockResolvedValue([activeEmployee, inactiveEmployee]);

    // Act
    renderWithProviders(<AdminEmployeesPage />);
    await screen.findByText("S1001");
    const rows = screen.getAllByRole("row").slice(1); // skip header row

    // Assert
    expect(within(rows[0]).getByRole("button", { name: /deactivate/i })).toBeInTheDocument();
    expect(within(rows[1]).getByRole("button", { name: /activate/i })).toBeInTheDocument();
  });

  describe("activate/deactivate actions", () => {
    const confirmSpy = vi.spyOn(window, "confirm");

    afterEach(() => confirmSpy.mockReset());

    it("deactivates an employee after the confirmation is accepted", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminEmployeeService.listAll.mockResolvedValue([activeEmployee]);
      mockedAdminEmployeeService.update.mockResolvedValue({ ...activeEmployee, active: false });
      const user = userEvent.setup();
      renderWithProviders(<AdminEmployeesPage />);
      await screen.findByText("S1001");

      // Act
      await user.click(screen.getByRole("button", { name: /deactivate/i }));

      // Assert
      expect(mockedAdminEmployeeService.update).toHaveBeenCalledWith(1, { active: false });
    });

    it("does nothing when the confirmation is declined", async () => {
      // Arrange
      confirmSpy.mockReturnValue(false);
      mockedAdminEmployeeService.listAll.mockResolvedValue([activeEmployee]);
      const user = userEvent.setup();
      renderWithProviders(<AdminEmployeesPage />);
      await screen.findByText("S1001");

      // Act
      await user.click(screen.getByRole("button", { name: /deactivate/i }));

      // Assert
      expect(mockedAdminEmployeeService.update).not.toHaveBeenCalled();
    });

    it("shows an error message when the action fails", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminEmployeeService.listAll.mockResolvedValue([activeEmployee]);
      mockedAdminEmployeeService.update.mockRejectedValue(new Error("Employee not found"));
      const user = userEvent.setup();
      renderWithProviders(<AdminEmployeesPage />);
      await screen.findByText("S1001");

      // Act
      await user.click(screen.getByRole("button", { name: /deactivate/i }));

      // Assert
      expect(await screen.findByRole("alert")).toHaveTextContent("Employee not found");
    });

    it("disables the action button while the mutation is in flight", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminEmployeeService.listAll.mockResolvedValue([activeEmployee]);
      let resolveUpdate!: (value: Employee) => void;
      mockedAdminEmployeeService.update.mockReturnValue(
        new Promise<Employee>((resolve) => {
          resolveUpdate = resolve;
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminEmployeesPage />);
      await screen.findByText("S1001");
      const deactivateButton = screen.getByRole("button", { name: /deactivate/i });

      // Act
      await user.click(deactivateButton);

      // Assert
      expect(deactivateButton).toBeDisabled();

      // Cleanup
      resolveUpdate({ ...activeEmployee, active: false });
    });
  });

  describe("bulk import", () => {
    function importFile() {
      return new File(["staff number,name"], "employees.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    }

    it("disables the Import button until a file is selected", async () => {
      // Act
      renderWithProviders(<AdminEmployeesPage />);
      await screen.findByText(/no employees found/i);

      // Assert
      expect(screen.getByRole("button", { name: /^import$/i })).toBeDisabled();
    });

    it("imports the selected file and shows the created/updated summary", async () => {
      // Arrange
      mockedAdminEmployeeService.importFile.mockResolvedValue({ created: 2, updated: 1, errors: [] });
      const user = userEvent.setup();
      renderWithProviders(<AdminEmployeesPage />);
      await screen.findByText(/no employees found/i);

      // Act
      await user.upload(screen.getByLabelText(/bulk import/i), importFile());
      await user.click(screen.getByRole("button", { name: /^import$/i }));

      // Assert
      expect(mockedAdminEmployeeService.importFile).toHaveBeenCalledWith(expect.any(File));
      expect(await screen.findByRole("status")).toHaveTextContent("2 created, 1 updated.");
    });

    it("lists per-row errors alongside the summary", async () => {
      // Arrange
      mockedAdminEmployeeService.importFile.mockResolvedValue({
        created: 1,
        updated: 0,
        errors: [{ row: 3, message: "Invalid email address" }],
      });
      const user = userEvent.setup();
      renderWithProviders(<AdminEmployeesPage />);
      await screen.findByText(/no employees found/i);

      // Act
      await user.upload(screen.getByLabelText(/bulk import/i), importFile());
      await user.click(screen.getByRole("button", { name: /^import$/i }));

      // Assert
      expect(await screen.findByText(/row 3: invalid email address/i)).toBeInTheDocument();
    });

    it("shows an error message when the import request itself fails", async () => {
      // Arrange
      mockedAdminEmployeeService.importFile.mockRejectedValue(
        new Error("Missing required column(s): email"),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminEmployeesPage />);
      await screen.findByText(/no employees found/i);

      // Act
      await user.upload(screen.getByLabelText(/bulk import/i), importFile());
      await user.click(screen.getByRole("button", { name: /^import$/i }));

      // Assert
      expect(await screen.findByRole("alert")).toHaveTextContent("Missing required column(s): email");
    });

    it("disables the Import button while the import is in flight", async () => {
      // Arrange
      let resolveImport!: (value: { created: number; updated: number; errors: never[] }) => void;
      mockedAdminEmployeeService.importFile.mockReturnValue(
        new Promise((resolve) => {
          resolveImport = resolve;
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminEmployeesPage />);
      await screen.findByText(/no employees found/i);
      await user.upload(screen.getByLabelText(/bulk import/i), importFile());
      const importButton = screen.getByRole("button", { name: /^import$/i });

      // Act
      await user.click(importButton);

      // Assert
      expect(importButton).toBeDisabled();

      // Cleanup
      resolveImport({ created: 1, updated: 0, errors: [] });
    });
  });
});
