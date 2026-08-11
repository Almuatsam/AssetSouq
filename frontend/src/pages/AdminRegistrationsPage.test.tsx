import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminRegistrationsPage from "@/pages/AdminRegistrationsPage";
import { adminRegistrationService } from "@/services/adminRegistrationService";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { AdminRegistrationRow } from "@/types/device";
import { setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/adminRegistrationService");

const mockedAdminRegistrationService = adminRegistrationService as unknown as {
  listAll: ReturnType<typeof vi.fn>;
  updateStatus: ReturnType<typeof vi.fn>;
};

const adminSession = {
  token: "tok",
  user: { role: "ADMIN" as const, admin: { id: 1, username: "admin1", lastLogin: null } },
};

const eligibleRegistration: AdminRegistrationRow = {
  id: 1,
  employeeId: 10,
  deviceId: 1,
  agreed: true,
  submittedAt: "2026-01-01T00:00:00.000Z",
  status: "ELIGIBLE",
  employee: { id: 10, staffNumber: "S1001", name: "Jane Doe", department: "Engineering" },
  device: {
    id: 1,
    assetTag: "AST-001",
    deviceType: "Laptop",
    brand: "Dell",
    model: "Latitude 5420",
    price: "150.00",
    status: "AVAILABLE",
  },
};

const withdrawnRegistration: AdminRegistrationRow = {
  ...eligibleRegistration,
  id: 2,
  employeeId: 11,
  status: "WITHDRAWN",
  employee: { id: 11, staffNumber: "S1002", name: "John Smith", department: "Sales" },
};

describe("AdminRegistrationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setStoredSession(adminSession);
    mockedAdminRegistrationService.listAll.mockResolvedValue([]);
  });

  it("lists registrations with employee, device, and status", async () => {
    // Arrange
    mockedAdminRegistrationService.listAll.mockResolvedValue([eligibleRegistration]);

    // Act
    renderWithProviders(<AdminRegistrationsPage />);

    // Assert
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("AST-001")).toBeInTheDocument();
    expect(within(row).getByText("150.00")).toBeInTheDocument();
    expect(within(row).getByText(/^eligible$/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no registrations", async () => {
    // Act
    renderWithProviders(<AdminRegistrationsPage />);

    // Assert
    expect(await screen.findByText(/no registrations found/i)).toBeInTheDocument();
  });

  it("shows an error message when the list fails to load", async () => {
    // Arrange
    mockedAdminRegistrationService.listAll.mockRejectedValue(new Error("network down"));

    // Act
    renderWithProviders(<AdminRegistrationsPage />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load registrations/i);
  });

  it("re-queries with a status filter when one is selected", async () => {
    // Arrange
    mockedAdminRegistrationService.listAll.mockResolvedValue([eligibleRegistration]);
    const user = userEvent.setup();
    renderWithProviders(<AdminRegistrationsPage />);
    await screen.findByText("Jane Doe");

    // Act
    await user.selectOptions(screen.getByLabelText(/status/i), "WITHDRAWN");

    // Assert
    await waitFor(() =>
      expect(mockedAdminRegistrationService.listAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: "WITHDRAWN" }),
      ),
    );
  });

  it("re-queries with a search term", async () => {
    // Arrange
    mockedAdminRegistrationService.listAll.mockResolvedValue([eligibleRegistration]);
    const user = userEvent.setup();
    renderWithProviders(<AdminRegistrationsPage />);
    await screen.findByText("Jane Doe");

    // Act
    await user.type(screen.getByLabelText(/search/i), "Jane");

    // Assert
    await waitFor(() =>
      expect(mockedAdminRegistrationService.listAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Jane" }),
      ),
    );
  });

  it("offers Mark Ineligible and Withdraw for an ELIGIBLE registration, and nothing for a WITHDRAWN one", async () => {
    // Arrange
    mockedAdminRegistrationService.listAll.mockResolvedValue([eligibleRegistration, withdrawnRegistration]);

    // Act
    renderWithProviders(<AdminRegistrationsPage />);
    await screen.findByText("Jane Doe");
    const rows = screen.getAllByRole("row").slice(1); // skip header row

    // Assert
    expect(within(rows[0]).getByRole("button", { name: /mark ineligible/i })).toBeInTheDocument();
    expect(within(rows[0]).getByRole("button", { name: /withdraw/i })).toBeInTheDocument();
    expect(within(rows[1]).queryByRole("button")).not.toBeInTheDocument();
  });

  describe("status actions", () => {
    const confirmSpy = vi.spyOn(window, "confirm");

    afterEach(() => confirmSpy.mockReset());

    it("withdraws a registration after the confirmation is accepted", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminRegistrationService.listAll.mockResolvedValue([eligibleRegistration]);
      mockedAdminRegistrationService.updateStatus.mockResolvedValue({
        ...eligibleRegistration,
        status: "WITHDRAWN",
      });
      const user = userEvent.setup();
      renderWithProviders(<AdminRegistrationsPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /withdraw/i }));

      // Assert
      expect(mockedAdminRegistrationService.updateStatus).toHaveBeenCalledWith(1, "WITHDRAWN");
    });

    it("does nothing when the confirmation is declined", async () => {
      // Arrange
      confirmSpy.mockReturnValue(false);
      mockedAdminRegistrationService.listAll.mockResolvedValue([eligibleRegistration]);
      const user = userEvent.setup();
      renderWithProviders(<AdminRegistrationsPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /withdraw/i }));

      // Assert
      expect(mockedAdminRegistrationService.updateStatus).not.toHaveBeenCalled();
    });

    it("shows an error message when the action fails", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminRegistrationService.listAll.mockResolvedValue([eligibleRegistration]);
      mockedAdminRegistrationService.updateStatus.mockRejectedValue(
        new Error("Cannot change registration status from WITHDRAWN to ELIGIBLE"),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminRegistrationsPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /mark ineligible/i }));

      // Assert
      expect(await screen.findByRole("alert")).toHaveTextContent(/cannot change registration status/i);
    });

    it("disables action buttons while a mutation is in flight", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminRegistrationService.listAll.mockResolvedValue([eligibleRegistration]);
      let resolveUpdate!: (value: AdminRegistrationRow) => void;
      mockedAdminRegistrationService.updateStatus.mockReturnValue(
        new Promise<AdminRegistrationRow>((resolve) => {
          resolveUpdate = resolve;
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminRegistrationsPage />);
      await screen.findByText("Jane Doe");
      const withdrawButton = screen.getByRole("button", { name: /withdraw/i });

      // Act
      await user.click(withdrawButton);

      // Assert
      expect(withdrawButton).toBeDisabled();

      // Cleanup
      resolveUpdate({ ...eligibleRegistration, status: "WITHDRAWN" });
    });
  });
});
