import { winnerRepository } from "../src/repositories/winnerRepository";
import { winnerService } from "../src/services/winnerService";

jest.mock("../src/repositories/winnerRepository");

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
  beforeEach(() => jest.clearAllMocks());

  it("rejects with a 404 when the winner doesn't exist", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(
      winnerService.recordPayment(999, { paymentStatus: "PAID" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("records a PAID payment with a payment date and the given method", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue(baseWinner as never);
    mockedWinnerRepo.updatePayment.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" } as never);

    // Act
    await winnerService.recordPayment(1, { paymentStatus: "PAID", paymentMethod: "Payroll deduction" });

    // Assert
    expect(mockedWinnerRepo.updatePayment).toHaveBeenCalledWith(1, {
      paymentStatus: "PAID",
      paymentMethod: "Payroll deduction",
      paymentDate: expect.any(Date),
    });
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
    );
  });

  it("records NON_PAYMENT with no payment date or method, even if one was supplied", async () => {
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
