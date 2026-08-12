import { prisma } from "../src/config/prisma";
import { employeeRepository } from "../src/repositories/employeeRepository";
import { winnerRepository } from "../src/repositories/winnerRepository";
import { winnerService } from "../src/services/winnerService";

jest.mock("../src/config/prisma", () => ({
  // recordPayment()'s PAID path wraps its writes in prisma.$transaction —
  // just invoke the callback with a placeholder tx object; every
  // repository call inside it is separately mocked below, so what "tx"
  // actually is doesn't matter for these tests, only that the callback
  // runs. Mirrors drawService.test.ts's identical setup.
  prisma: { $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})) },
}));
jest.mock("../src/repositories/employeeRepository");
jest.mock("../src/repositories/winnerRepository");

const mockedPrisma = prisma as unknown as { $transaction: jest.Mock };
const mockedEmployeeRepo = employeeRepository as jest.Mocked<typeof employeeRepository>;
const mockedWinnerRepo = winnerRepository as jest.Mocked<typeof winnerRepository>;

const baseWinner = {
  id: 1,
  employeeId: 10,
  deviceId: 1,
  drawId: 100,
  drawDate: new Date(),
  accepted: false,
  priceDue: "150.00",
  paymentStatus: "PENDING" as const,
  paymentDate: null,
  paymentMethod: null,
  handoverDate: null,
  redrawOf: null,
  redrawReason: null,
};

describe("winnerService.listAllForAdmin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes the given filters through to the repository", async () => {
    // Arrange
    mockedWinnerRepo.findAllForAdmin.mockResolvedValue([]);

    // Act
    await winnerService.listAllForAdmin({ paymentStatus: "PENDING" });

    // Assert
    expect(mockedWinnerRepo.findAllForAdmin).toHaveBeenCalledWith({ paymentStatus: "PENDING" });
  });
});

describe("winnerService.recordPayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWinnerRepo.findByRedrawOf.mockResolvedValue(null);
  });

  it("rejects with a 404 when the winner doesn't exist", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(
      winnerService.recordPayment(999, { paymentStatus: "PAID" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  // Regression, whole-system audit finding: recordPayment() had no guard
  // against acting on a Winner row that's already been superseded by a
  // redraw (drawService.redrawWinner() creates a *new* Winner row for
  // the replacement rather than mutating the original) — a stale "Mark
  // Paid" click on the original row would still stamp
  // employee.lastWinnerDate for a win that employee never actually
  // received, with no admin-facing way to undo it, and would let
  // recordHandover() below hand the device to the wrong person. Mirrors
  // redrawWinner()'s own "already been redrawn" guard.
  it("rejects with a 409 when the winner has already been redrawn away", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue(baseWinner as never);
    mockedWinnerRepo.findByRedrawOf.mockResolvedValue({ id: 2, redrawOf: 1 } as never);

    // Act / Assert
    await expect(
      winnerService.recordPayment(1, { paymentStatus: "PAID" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedWinnerRepo.updatePayment).not.toHaveBeenCalled();
    expect(mockedEmployeeRepo.markAsWinner).not.toHaveBeenCalled();
  });

  it("rejects with a 409 when re-confirming an already-PAID winner as PAID again", async () => {
    // Arrange — avoids silently re-stamping lastWinnerDate with a fresh
    // timestamp for no reason; PAID -> NON_PAYMENT (a real correction)
    // stays allowed, see the NON_PAYMENT test below.
    mockedWinnerRepo.findById.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" } as never);

    // Act / Assert
    await expect(
      winnerService.recordPayment(1, { paymentStatus: "PAID" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedWinnerRepo.updatePayment).not.toHaveBeenCalled();
    expect(mockedEmployeeRepo.markAsWinner).not.toHaveBeenCalled();
  });

  it("records a PAID payment with a payment date and the given method", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue(baseWinner as never);
    mockedWinnerRepo.updatePayment.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" } as never);

    // Act
    await winnerService.recordPayment(1, { paymentStatus: "PAID", paymentMethod: "Payroll deduction" });

    // Assert
    expect(mockedWinnerRepo.updatePayment).toHaveBeenCalledWith(
      1,
      {
        paymentStatus: "PAID",
        paymentMethod: "Payroll deduction",
        paymentDate: expect.any(Date),
      },
      expect.anything(),
    );
  });

  it("records a PAID payment with no method given as null, not undefined", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue(baseWinner as never);
    mockedWinnerRepo.updatePayment.mockResolvedValue(baseWinner as never);

    // Act
    await winnerService.recordPayment(1, { paymentStatus: "PAID" });

    // Assert
    expect(mockedWinnerRepo.updatePayment).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ paymentMethod: null }),
      expect.anything(),
    );
  });

  it("stamps the employee's lastWinnerDate (24-month cooldown) only once payment is confirmed", async () => {
    // Arrange — this is the fix for a whole-system audit finding: the
    // cooldown used to start at draw-time *selection*, which incorrectly
    // penalized a candidate who was later redrawn away (declined,
    // unpaid, no-show, admin override) for a win they never received.
    // Anchoring it to PAID instead — this codebase's own established
    // "point of no return" for a winner (redrawWinner() already refuses
    // to redraw a PAID winner) — means it's only ever set for a
    // confirmed win.
    mockedWinnerRepo.findById.mockResolvedValue(baseWinner as never);
    mockedWinnerRepo.updatePayment.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" } as never);

    // Act
    await winnerService.recordPayment(1, { paymentStatus: "PAID" });

    // Assert
    expect(mockedPrisma.$transaction).toHaveBeenCalled();
    expect(mockedEmployeeRepo.markAsWinner).toHaveBeenCalledWith(baseWinner.employeeId, expect.anything());
  });

  it("records NON_PAYMENT with no payment date or method, even if one was supplied, and never touches lastWinnerDate", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue(baseWinner as never);
    mockedWinnerRepo.updatePayment.mockResolvedValue({ ...baseWinner, paymentStatus: "NON_PAYMENT" } as never);

    // Act
    await winnerService.recordPayment(1, { paymentStatus: "NON_PAYMENT", paymentMethod: "Cash" });

    // Assert — paymentMethod is ignored/cleared for a non-PAID outcome,
    // even though the (invalid for this case) input included one.
    expect(mockedWinnerRepo.updatePayment).toHaveBeenCalledWith(1, {
      paymentStatus: "NON_PAYMENT",
      paymentMethod: null,
      paymentDate: null,
    });
    expect(mockedEmployeeRepo.markAsWinner).not.toHaveBeenCalled();
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("still allows correcting an already-PAID winner to NON_PAYMENT", async () => {
    // Arrange — the "already PAID" guard above only blocks a redundant
    // PAID -> PAID re-confirmation; correcting a mistaken PAID back to
    // NON_PAYMENT is a legitimate admin action and must stay allowed.
    mockedWinnerRepo.findById.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" } as never);
    mockedWinnerRepo.updatePayment.mockResolvedValue({ ...baseWinner, paymentStatus: "NON_PAYMENT" } as never);

    // Act
    await winnerService.recordPayment(1, { paymentStatus: "NON_PAYMENT" });

    // Assert
    expect(mockedWinnerRepo.updatePayment).toHaveBeenCalledWith(1, {
      paymentStatus: "NON_PAYMENT",
      paymentMethod: null,
      paymentDate: null,
    });
  });
});

describe("winnerService.recordHandover", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects with a 404 when the winner doesn't exist", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(winnerService.recordHandover(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects with a 409 when the winner hasn't paid yet", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue({ ...baseWinner, paymentStatus: "PENDING" } as never);

    // Act / Assert
    await expect(winnerService.recordHandover(1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedWinnerRepo.updateHandover).not.toHaveBeenCalled();
  });

  it("rejects with a 409 when the device has already been handed over", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue({
      ...baseWinner,
      paymentStatus: "PAID",
      handoverDate: new Date(),
    } as never);

    // Act / Assert
    await expect(winnerService.recordHandover(1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedWinnerRepo.updateHandover).not.toHaveBeenCalled();
  });

  it("records the handover date for a paid, not-yet-handed-over winner", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" } as never);
    mockedWinnerRepo.updateHandover.mockResolvedValue({
      ...baseWinner,
      paymentStatus: "PAID",
      handoverDate: new Date(),
    } as never);

    // Act
    const result = await winnerService.recordHandover(1);

    // Assert
    expect(result.handoverDate).not.toBeNull();
    expect(mockedWinnerRepo.updateHandover).toHaveBeenCalledWith(1, expect.any(Date));
  });
});
