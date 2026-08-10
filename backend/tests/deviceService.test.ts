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

describe("deviceService.listAll", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes an optional status filter through to the repository", async () => {
    // Arrange
    mockedDeviceRepo.findAll.mockResolvedValue([baseDevice] as never);

    // Act
    const result = await deviceService.listAll("REMOVED");

    // Assert
    expect(result).toEqual([baseDevice]);
    expect(mockedDeviceRepo.findAll).toHaveBeenCalledWith("REMOVED");
  });

  it("lists every status when no filter is given", async () => {
    // Arrange
    mockedDeviceRepo.findAll.mockResolvedValue([baseDevice] as never);

    // Act
    await deviceService.listAll();

    // Assert
    expect(mockedDeviceRepo.findAll).toHaveBeenCalledWith(undefined);
  });
});

describe("deviceService.createDevice", () => {
  const createInput = {
    assetTag: "AST-002",
    deviceType: "Laptop",
    brand: "HP",
    model: "EliteBook 840",
    price: 200,
    quantity: 1,
  };

  beforeEach(() => jest.clearAllMocks());

  it("creates the device when the asset tag is unused", async () => {
    // Arrange
    mockedDeviceRepo.findByAssetTag.mockResolvedValue(null);
    mockedDeviceRepo.create.mockResolvedValue({ ...baseDevice, ...createInput } as never);

    // Act
    const result = await deviceService.createDevice(createInput as never);

    // Assert
    expect(result.assetTag).toBe("AST-002");
    expect(mockedDeviceRepo.create).toHaveBeenCalledWith(createInput);
  });

  it("rejects with a 409 when the asset tag is already in use", async () => {
    // Arrange
    mockedDeviceRepo.findByAssetTag.mockResolvedValue(baseDevice as never);

    // Act / Assert
    await expect(deviceService.createDevice(createInput as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mockedDeviceRepo.create).not.toHaveBeenCalled();
  });
});

describe("deviceService.updateDevice", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates the device when it exists", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedDeviceRepo.update.mockResolvedValue({ ...baseDevice, price: "175.00" } as never);

    // Act
    const result = await deviceService.updateDevice(1, { price: 175 } as never);

    // Assert
    expect(result.price).toBe("175.00");
    expect(mockedDeviceRepo.update).toHaveBeenCalledWith(1, { price: 175 });
  });

  it("rejects with a 404 when the device doesn't exist", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(deviceService.updateDevice(999, { price: 175 } as never)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("allows removing an AVAILABLE device", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedDeviceRepo.update.mockResolvedValue({ ...baseDevice, status: "REMOVED" } as never);

    // Act
    const result = await deviceService.updateDevice(1, { status: "REMOVED" } as never);

    // Assert
    expect(result.status).toBe("REMOVED");
  });

  it("rejects with a 409 when trying to remove a device that isn't AVAILABLE", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, status: "SOLD" } as never);

    // Act / Assert
    await expect(deviceService.updateDevice(1, { status: "REMOVED" } as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mockedDeviceRepo.update).not.toHaveBeenCalled();
  });

  it("allows un-removing a REMOVED device back to AVAILABLE", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, status: "REMOVED" } as never);
    mockedDeviceRepo.update.mockResolvedValue({ ...baseDevice, status: "AVAILABLE" } as never);

    // Act
    const result = await deviceService.updateDevice(1, { status: "AVAILABLE" } as never);

    // Assert
    expect(result.status).toBe("AVAILABLE");
  });

  // Regression: a caller could previously flip a DRAWN/SOLD device to
  // AVAILABLE in one PATCH (unguarded) and then to REMOVED in a second
  // PATCH (guarded, but now satisfied) — bypassing "only an available
  // device can be removed" via two individually-"valid" edits. Caught in
  // review before merge; both halves of the bypass must now be rejected.
  it("rejects setting a SOLD device back to AVAILABLE (closes the two-step removal bypass)", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, status: "SOLD" } as never);

    // Act / Assert
    await expect(deviceService.updateDevice(1, { status: "AVAILABLE" } as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mockedDeviceRepo.update).not.toHaveBeenCalled();
  });

  it("rejects setting a DRAWN device back to AVAILABLE", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, status: "DRAWN" } as never);

    // Act / Assert
    await expect(deviceService.updateDevice(1, { status: "AVAILABLE" } as never)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("rejects setting status to DRAWN/SOLD via this endpoint at all", async () => {
    // Arrange — those states belong exclusively to the future draw/
    // payment workflow, never this generic admin edit endpoint.
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);

    // Act / Assert
    await expect(deviceService.updateDevice(1, { status: "DRAWN" } as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(deviceService.updateDevice(1, { status: "SOLD" } as never)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("does not run the status transition check when status is unchanged", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedDeviceRepo.update.mockResolvedValue(baseDevice as never);

    // Act / Assert — same status re-sent alongside another field edit
    // shouldn't be treated as a (no-op) transition and rejected.
    await expect(
      deviceService.updateDevice(1, { status: "AVAILABLE", price: 175 } as never),
    ).resolves.toBeDefined();
  });
});
