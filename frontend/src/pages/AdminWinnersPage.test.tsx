import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminWinnersPage from "@/pages/AdminWinnersPage";
import { adminWinnerService } from "@/services/adminWinnerService";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { Winner } from "@/types/winner";
import { setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/adminWinnerService");

const mockedAdminWinnerService = adminWinnerService as unknown as {
  listAll: ReturnType<typeof vi.fn>;
  recordPayment: ReturnType<typeof vi.fn>;
  recordHandover: ReturnType<typeof vi.fn>;
  redraw: ReturnType<typeof vi.fn>;
};

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

  const paidWinner: Winner = { ...baseWinner, id: 2, paymentStatus: "PAID" };
  const handedOverWinner: Winner = {
    ...baseWinner,
    id: 3,
    paymentStatus: "PAID",
    handoverDate: "2026-01-05T00:00:00.000Z",
  };

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

  describe("row action visibility", () => {
    it("shows Mark Paid, Mark Non-Payment, and Redraw for a pending winner, but not Record Handover", async () => {
      // Arrange
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);

      // Act
      renderWithProviders(<AdminWinnersPage />);
      const row = (await screen.findAllByRole("row"))[1];

      // Assert
      expect(within(row).getByRole("button", { name: /mark paid/i })).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: /mark non-payment/i })).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: /^redraw$/i })).toBeInTheDocument();
      expect(within(row).queryByRole("button", { name: /record handover/i })).not.toBeInTheDocument();
    });

    it("shows only Record Handover for a paid, not-yet-handed-over winner", async () => {
      // Arrange
      mockedAdminWinnerService.listAll.mockResolvedValue([paidWinner]);

      // Act
      renderWithProviders(<AdminWinnersPage />);
      const row = (await screen.findAllByRole("row"))[1];

      // Assert
      expect(within(row).getByRole("button", { name: /record handover/i })).toBeInTheDocument();
      expect(within(row).queryByRole("button", { name: /^redraw$/i })).not.toBeInTheDocument();
      expect(within(row).queryByRole("button", { name: /mark paid/i })).not.toBeInTheDocument();
      expect(within(row).queryByRole("button", { name: /mark non-payment/i })).not.toBeInTheDocument();
    });

    it("shows no payment/redraw actions for a winner who has already been redrawn away", async () => {
      // Arrange — a replacement winner (redrawOf: 1) exists alongside the
      // original, still-PENDING row it replaced. The backend now rejects
      // recording payment against a superseded winner row (see
      // winnerService.recordPayment()'s findByRedrawOf guard), so Mark
      // Paid/Mark Non-Payment must be hidden here too, not just Redraw.
      const replacementWinner = { ...baseWinner, id: 2, employeeId: 11, redrawOf: 1 };
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner, replacementWinner]);

      // Act
      renderWithProviders(<AdminWinnersPage />);
      const rows = await screen.findAllByRole("row");
      const originalRow = rows[1];

      // Assert
      expect(within(originalRow).queryByRole("button", { name: /mark paid/i })).not.toBeInTheDocument();
      expect(
        within(originalRow).queryByRole("button", { name: /mark non-payment/i }),
      ).not.toBeInTheDocument();
      expect(within(originalRow).queryByRole("button", { name: /^redraw$/i })).not.toBeInTheDocument();
    });

    it("shows no actions for a handed-over winner", async () => {
      // Arrange
      mockedAdminWinnerService.listAll.mockResolvedValue([handedOverWinner]);

      // Act
      renderWithProviders(<AdminWinnersPage />);
      const row = (await screen.findAllByRole("row"))[1];

      // Assert
      expect(within(row).queryByRole("button")).not.toBeInTheDocument();
      expect(within(row).getByText(/handed over on/i)).toBeInTheDocument();
    });
  });

  describe("mark paid / non-payment actions", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const promptSpy = vi.spyOn(window, "prompt");

    afterEach(() => {
      confirmSpy.mockReset();
      promptSpy.mockReset();
    });

    it("records a payment with the entered payment method after confirmation", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      promptSpy.mockReturnValue("Payroll deduction");
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
      mockedAdminWinnerService.recordPayment.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" });
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /mark paid/i }));

      // Assert
      expect(mockedAdminWinnerService.recordPayment).toHaveBeenCalledWith(1, {
        paymentStatus: "PAID",
        paymentMethod: "Payroll deduction",
      });
    });

    it("records a payment with no payment method when the prompt is cancelled", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      promptSpy.mockReturnValue(null);
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
      mockedAdminWinnerService.recordPayment.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" });
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /mark paid/i }));

      // Assert
      expect(mockedAdminWinnerService.recordPayment).toHaveBeenCalledWith(1, {
        paymentStatus: "PAID",
        paymentMethod: undefined,
      });
    });

    it("does nothing when the mark-paid confirmation is declined", async () => {
      // Arrange
      confirmSpy.mockReturnValue(false);
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /mark paid/i }));

      // Assert
      expect(mockedAdminWinnerService.recordPayment).not.toHaveBeenCalled();
      expect(promptSpy).not.toHaveBeenCalled();
    });

    it("records a non-payment after confirmation, with no prompt shown", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
      mockedAdminWinnerService.recordPayment.mockResolvedValue({
        ...baseWinner,
        paymentStatus: "NON_PAYMENT",
      });
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /mark non-payment/i }));

      // Assert
      expect(mockedAdminWinnerService.recordPayment).toHaveBeenCalledWith(1, {
        paymentStatus: "NON_PAYMENT",
      });
      expect(promptSpy).not.toHaveBeenCalled();
    });

    it("shows an error message when recording a non-payment fails", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
      mockedAdminWinnerService.recordPayment.mockRejectedValue(new Error("Winner not found"));
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /mark non-payment/i }));

      // Assert
      expect(await screen.findByRole("alert")).toHaveTextContent("Winner not found");
    });

    it("shows an error message when marking a winner paid fails", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      promptSpy.mockReturnValue("");
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
      mockedAdminWinnerService.recordPayment.mockRejectedValue(new Error("Winner not found"));
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /mark paid/i }));

      // Assert
      expect(await screen.findByRole("alert")).toHaveTextContent("Winner not found");
    });

    it("does not disable another row's actions while one row's mark-paid mutation is in flight", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      promptSpy.mockReturnValue("");
      const otherWinner: Winner = { ...baseWinner, id: 5, employee: { ...baseWinner.employee, name: "Sam Lee" } };
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner, otherWinner]);
      let resolvePayment!: (value: Winner) => void;
      mockedAdminWinnerService.recordPayment.mockReturnValue(
        new Promise<Winner>((resolve) => {
          resolvePayment = resolve;
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");
      const rows = (await screen.findAllByRole("row")).slice(1);

      // Act — start row 1's mark-paid mutation, leave it unresolved
      await user.click(within(rows[0]).getByRole("button", { name: /mark paid/i }));

      // Assert — row 1's own buttons are disabled, but row 2's are untouched
      expect(within(rows[0]).getByRole("button", { name: /mark paid/i })).toBeDisabled();
      expect(within(rows[1]).getByRole("button", { name: /mark paid/i })).toBeEnabled();
      expect(within(rows[1]).getByRole("button", { name: /mark non-payment/i })).toBeEnabled();

      // Cleanup — resolve so the mutation doesn't leak into the next test
      resolvePayment({ ...baseWinner, paymentStatus: "PAID" });
    });
  });

  describe("record handover action", () => {
    const confirmSpy = vi.spyOn(window, "confirm");

    afterEach(() => confirmSpy.mockReset());

    it("records the handover after confirmation", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminWinnerService.listAll.mockResolvedValue([paidWinner]);
      mockedAdminWinnerService.recordHandover.mockResolvedValue({
        ...paidWinner,
        handoverDate: "2026-01-05T00:00:00.000Z",
      });
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /record handover/i }));

      // Assert
      expect(mockedAdminWinnerService.recordHandover).toHaveBeenCalledWith(2);
    });

    it("does nothing when the handover confirmation is declined", async () => {
      // Arrange
      confirmSpy.mockReturnValue(false);
      mockedAdminWinnerService.listAll.mockResolvedValue([paidWinner]);
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /record handover/i }));

      // Assert
      expect(mockedAdminWinnerService.recordHandover).not.toHaveBeenCalled();
    });

    it("shows an error message when the handover fails", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminWinnerService.listAll.mockResolvedValue([paidWinner]);
      mockedAdminWinnerService.recordHandover.mockRejectedValue(
        new Error("This device has already been handed over"),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /record handover/i }));

      // Assert
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "This device has already been handed over",
      );
    });
  });

  describe("redraw action", () => {
    const confirmSpy = vi.spyOn(window, "confirm");

    afterEach(() => confirmSpy.mockReset());

    it("redraws the winner with the selected reason after confirmation", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
      mockedAdminWinnerService.redraw.mockResolvedValue({ ...baseWinner, id: 4, redrawOf: 1 });
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.selectOptions(screen.getByLabelText(/redraw reason/i), "NO_SHOW");
      await user.click(screen.getByRole("button", { name: /^redraw$/i }));

      // Assert
      expect(mockedAdminWinnerService.redraw).toHaveBeenCalledWith(1, "NO_SHOW");
    });

    it("does nothing when the redraw confirmation is declined", async () => {
      // Arrange
      confirmSpy.mockReturnValue(false);
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /^redraw$/i }));

      // Assert
      expect(mockedAdminWinnerService.redraw).not.toHaveBeenCalled();
    });

    it("shows an error message when the redraw fails (e.g. waiting list exhausted)", async () => {
      // Arrange
      confirmSpy.mockReturnValue(true);
      mockedAdminWinnerService.listAll.mockResolvedValue([baseWinner]);
      mockedAdminWinnerService.redraw.mockRejectedValue(
        new Error("No remaining eligible candidates in the waiting list"),
      );
      const user = userEvent.setup();
      renderWithProviders(<AdminWinnersPage />);
      await screen.findByText("Jane Doe");

      // Act
      await user.click(screen.getByRole("button", { name: /^redraw$/i }));

      // Assert
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "No remaining eligible candidates in the waiting list",
      );
    });
  });
});
