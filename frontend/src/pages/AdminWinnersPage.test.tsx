import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminWinnersPage from "@/pages/AdminWinnersPage";
import { adminWinnerService } from "@/services/adminWinnerService";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { Winner } from "@/types/winner";
import { setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/adminWinnerService");

const mockedAdminWinnerService = adminWinnerService as unknown as { listAll: ReturnType<typeof vi.fn> };

const adminSession = {
  token: "tok",
  user: { role: "ADMIN" as const, admin: { id: 1, username: "admin1", lastLogin: null } },
};

const baseWinner: Winner = {
  id: 1,
  employeeId: 10,
  deviceId: 1,
  drawId: 100,
  drawDate: "2026-01-01T00:00:00.000Z",
  accepted: false,
  priceDue: "150.00",
  paymentStatus: "PENDING",
  paymentDate: null,
  paymentMethod: null,
  handoverDate: null,
  redrawOf: null,
  redrawReason: null,
  employee: { id: 10, staffNumber: "S1001", name: "Jane Doe", department: "Engineering" },
  device: {
    id: 1,
    assetTag: "AST-001",
    deviceType: "Laptop",
    brand: "Dell",
    model: "Latitude 5420",
    price: "150.00",
    status: "DRAWN",
  },
};

describe("AdminWinnersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setStoredSession(adminSession);
    mockedAdminWinnerService.listAll.mockResolvedValue([]);
  });

  it("lists winners with employee, device, price, and payment status", async () => {
    // Arrange
    mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);

    // Act
    renderWithProviders(<AdminWinnersPage />);

    // Assert
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("AST-001")).toBeInTheDocument();
    expect(within(row).getByText("150.00")).toBeInTheDocument();
    expect(within(row).getByText(/pending/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no winners", async () => {
    // Act
    renderWithProviders(<AdminWinnersPage />);

    // Assert
    expect(await screen.findByText(/no winners/i)).toBeInTheDocument();
  });

  it("shows an error message when the list fails to load", async () => {
    // Arrange
    mockedAdminWinnerService.listAll.mockRejectedValue(new Error("network down"));

    // Act
    renderWithProviders(<AdminWinnersPage />);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load winners/i);
  });

  it("re-queries with a payment status filter when one is selected", async () => {
    // Arrange
    mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
    const user = userEvent.setup();
    renderWithProviders(<AdminWinnersPage />);
    await screen.findByText("Jane Doe");

    // Act
    await user.selectOptions(screen.getByLabelText(/status/i), "PAID");

    // Assert
    await waitFor(() =>
      expect(mockedAdminWinnerService.listAll).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: "PAID" }),
      ),
    );
  });
});
