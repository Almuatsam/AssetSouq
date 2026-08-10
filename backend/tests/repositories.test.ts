// Direct tests for the repository layer's own query-building logic —
// service-layer tests mock these repositories entirely, so without this
// file the actual `prisma.<model>.<method>({...})` calls they build never
// run. Mocking one layer deeper (the Prisma client itself, at the
// config/prisma module boundary) exercises that logic for real while
// still never touching a database.
import { prisma } from "../src/config/prisma";
import { adminRepository } from "../src/repositories/adminRepository";
import { deviceRepository } from "../src/repositories/deviceRepository";
import { employeeRepository } from "../src/repositories/employeeRepository";
import { registrationRepository } from "../src/repositories/registrationRepository";

jest.mock("../src/config/prisma", () => ({
  prisma: {
    admin: { findUnique: jest.fn(), update: jest.fn() },
    employee: { findUnique: jest.fn() },
    device: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    registration: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  admin: { findUnique: jest.Mock; update: jest.Mock };
  employee: { findUnique: jest.Mock };
  device: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  registration: { findFirst: jest.Mock; create: jest.Mock };
};

beforeEach(() => jest.clearAllMocks());

describe("adminRepository", () => {
  it("findByUsername() queries by username", async () => {
    // Act
    await adminRepository.findByUsername("admin1");

    // Assert
    expect(mockedPrisma.admin.findUnique).toHaveBeenCalledWith({ where: { username: "admin1" } });
  });

  it("updateLastLogin() sets lastLogin to a fresh timestamp for the given id", async () => {
    // Act
    await adminRepository.updateLastLogin(1);

    // Assert
    expect(mockedPrisma.admin.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { lastLogin: expect.any(Date) },
    });
  });
});

describe("employeeRepository", () => {
  it("findByStaffNumber() queries by staffNumber", async () => {
    // Act
    await employeeRepository.findByStaffNumber("S1001");

    // Assert
    expect(mockedPrisma.employee.findUnique).toHaveBeenCalledWith({ where: { staffNumber: "S1001" } });
  });

  it("findById() queries by id", async () => {
    // Act
    await employeeRepository.findById(1);

    // Assert
    expect(mockedPrisma.employee.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe("deviceRepository", () => {
  it("findAvailable() queries only AVAILABLE devices, newest first", async () => {
    // Act
    await deviceRepository.findAvailable();

    // Assert
    expect(mockedPrisma.device.findMany).toHaveBeenCalledWith({
      where: { status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("findById() queries by id", async () => {
    // Act
    await deviceRepository.findById(5);

    // Assert
    expect(mockedPrisma.device.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("findByAssetTag() queries by assetTag", async () => {
    // Act
    await deviceRepository.findByAssetTag("AST-001");

    // Assert
    expect(mockedPrisma.device.findUnique).toHaveBeenCalledWith({ where: { assetTag: "AST-001" } });
  });

  it("findAll() queries every device, newest first, with no status filter by default", async () => {
    // Act
    await deviceRepository.findAll();

    // Assert
    expect(mockedPrisma.device.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { createdAt: "desc" },
    });
  });

  it("findAll() filters by status when given one", async () => {
    // Act
    await deviceRepository.findAll("REMOVED");

    // Assert
    expect(mockedPrisma.device.findMany).toHaveBeenCalledWith({
      where: { status: "REMOVED" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("create() persists a new device", async () => {
    // Arrange
    const data = { assetTag: "AST-002", deviceType: "Laptop", brand: "HP", model: "840", price: 200 };

    // Act
    await deviceRepository.create(data as never);

    // Assert
    expect(mockedPrisma.device.create).toHaveBeenCalledWith({ data });
  });

  it("update() updates the given device by id", async () => {
    // Act
    await deviceRepository.update(1, { status: "REMOVED" });

    // Assert
    expect(mockedPrisma.device.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "REMOVED" },
    });
  });
});

describe("registrationRepository", () => {
  it("findActiveByEmployeeId() queries PENDING/ELIGIBLE registrations for the employee", async () => {
    // Act
    await registrationRepository.findActiveByEmployeeId(10);

    // Assert
    expect(mockedPrisma.registration.findFirst).toHaveBeenCalledWith({
      where: { employeeId: 10, status: { in: ["PENDING", "ELIGIBLE"] } },
    });
  });

  it("create() persists a new registration with status ELIGIBLE", async () => {
    // Act
    await registrationRepository.create({ employeeId: 10, deviceId: 1, agreed: true });

    // Assert
    expect(mockedPrisma.registration.create).toHaveBeenCalledWith({
      data: { employeeId: 10, deviceId: 1, agreed: true, status: "ELIGIBLE" },
    });
  });

  it("accepts an explicit transaction client in place of the default shared one", async () => {
    // Arrange — the actual usage pattern in registrationService.ts's
    // locked re-check.
    const tx = { registration: { findFirst: jest.fn(), create: jest.fn() } } as never;

    // Act
    await registrationRepository.findActiveByEmployeeId(10, tx);
    await registrationRepository.create({ employeeId: 10, deviceId: 1, agreed: true }, tx);

    // Assert — the tx client was used, not the default shared one.
    expect((tx as { registration: { findFirst: jest.Mock } }).registration.findFirst).toHaveBeenCalled();
    expect((tx as { registration: { create: jest.Mock } }).registration.create).toHaveBeenCalled();
    expect(mockedPrisma.registration.findFirst).not.toHaveBeenCalled();
    expect(mockedPrisma.registration.create).not.toHaveBeenCalled();
  });

  it("lockEmployeeForUpdate() issues a locking read against the employee row", async () => {
    // Arrange
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]) } as never;

    // Act
    await registrationRepository.lockEmployeeForUpdate(10, tx);

    // Assert
    expect((tx as { $queryRaw: jest.Mock }).$queryRaw).toHaveBeenCalled();
  });

  it("findLatestByEmployeeId() queries the employee's most recent registration with device details", async () => {
    // Act
    await registrationRepository.findLatestByEmployeeId(10);

    // Assert
    expect(mockedPrisma.registration.findFirst).toHaveBeenCalledWith({
      where: { employeeId: 10 },
      orderBy: { submittedAt: "desc" },
      include: {
        device: {
          select: {
            id: true,
            assetTag: true,
            deviceType: true,
            brand: true,
            model: true,
            price: true,
            status: true,
          },
        },
      },
    });
  });
});
