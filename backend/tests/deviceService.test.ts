import { deviceRepository } from "../src/repositories/deviceRepository";
import { deviceService } from "../src/services/deviceService";

jest.mock("../src/repositories/deviceRepository");

const mockedDeviceRepo = deviceRepository as jest.Mocked<typeof deviceRepository>;

const baseDevice = {
  id: 1,
  assetTag: "AST-001",
  deviceType: "Laptop",
  brand: "Dell",
  model: "Latitude 5420",
  cpu: "i5-1135G7",
  ram: "16GB",
  storage: "256GB SSD",
  purchaseYear: 2021,
  yearsUsed: 4,
  price: "150.00",
  status: "AVAILABLE",
  quantity: 1,
  createdAt: new Date(),
};

describe("deviceService.listAvailable", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the available devices from the repository", async () => {
    // Arrange
    mockedDeviceRepo.findAvailable.mockResolvedValue([baseDevice] as never);

    // Act
    const result = await deviceService.listAvailable();

    // Assert
    expect(result).toEqual([baseDevice]);
  });
});

describe("deviceService.getById", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the device when found", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);

    // Act
    const result = await deviceService.getById(1);

    // Assert
    expect(result).toEqual(baseDevice);
  });

  it("throws a 404 AppError when the device doesn't exist", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(deviceService.getById(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
