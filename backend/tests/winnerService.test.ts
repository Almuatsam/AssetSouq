import { winnerRepository } from "../src/repositories/winnerRepository";
import { winnerService } from "../src/services/winnerService";

jest.mock("../src/repositories/winnerRepository");

const mockedWinnerRepo = winnerRepository as jest.Mocked<typeof winnerRepository>;

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
