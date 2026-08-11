// Direct tests for the repository layer's own query-building logic —
// service-layer tests mock these repositories entirely, so without this
// file the actual `prisma.<model>.<method>({...})` calls they build never
// run. Mocking one layer deeper (the Prisma client itself, at the
// config/prisma module boundary) exercises that logic for real while
// still never touching a database.
import { prisma } from "../src/config/prisma";
import { adminRepository } from "../src/repositories/adminRepository";
import { auditLogRepository } from "../src/repositories/auditLogRepository";
import { deviceRepository } from "../src/repositories/deviceRepository";
import { drawRepository } from "../src/repositories/drawRepository";
import { employeeRepository } from "../src/repositories/employeeRepository";
import { registrationRepository } from "../src/repositories/registrationRepository";
import { winnerRepository } from "../src/repositories/winnerRepository";

jest.mock("../src/config/prisma", () => ({
  prisma: {
    admin: { findUnique: jest.fn(), update: jest.fn() },
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    device: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    registration: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    draw: { create: jest.fn(), findUnique: jest.fn() },
    winner: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  admin: { findUnique: jest.Mock; update: jest.Mock };
  employee: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  device: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    groupBy: jest.Mock;
  };
  registration: {
    findFirst: jest.Mock;
    create: jest.Mock;
    groupBy: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  draw: { create: jest.Mock; findUnique: jest.Mock };
  winner: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  auditLog: { create: jest.Mock };
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

  it("findByEmail() queries by email", async () => {
    // Act
    await employeeRepository.findByEmail("jane.doe@example.com");

    // Assert
    expect(mockedPrisma.employee.findUnique).toHaveBeenCalledWith({
      where: { email: "jane.doe@example.com" },
    });
  });

  it("findAll() queries with no filter by default, newest first", async () => {
    // Act
    await employeeRepository.findAll({});

    // Assert
    expect(mockedPrisma.employee.findMany).toHaveBeenCalledWith({
      where: { active: undefined, eligible: undefined, laptopHolder: undefined, department: undefined },
      orderBy: { createdAt: "desc" },
    });
  });

  it("findAll() filters by active/eligible/laptopHolder/department when given", async () => {
    // Act
    await employeeRepository.findAll({
      active: true,
      eligible: false,
      laptopHolder: true,
      department: "Engineering",
    });

    // Assert
    expect(mockedPrisma.employee.findMany).toHaveBeenCalledWith({
      where: { active: true, eligible: false, laptopHolder: true, department: "Engineering" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("findAll() adds an OR search across name/staffNumber/email when a search term is given", async () => {
    // Act
    await employeeRepository.findAll({ search: "Jane" });

    // Assert
    expect(mockedPrisma.employee.findMany).toHaveBeenCalledWith({
      where: {
        active: undefined,
        eligible: undefined,
        laptopHolder: undefined,
        department: undefined,
        OR: [
          { name: { contains: "Jane" } },
          { staffNumber: { contains: "Jane" } },
          { email: { contains: "Jane" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("create() persists a new employee", async () => {
    // Arrange
    const data = { staffNumber: "S1002", name: "John Smith", department: "Sales", email: "john@example.com" };

    // Act
    await employeeRepository.create(data as never);

    // Assert
    expect(mockedPrisma.employee.create).toHaveBeenCalledWith({ data });
  });

  it("update() updates the given employee by id", async () => {
    // Act
    await employeeRepository.update(1, { active: false });

    // Assert
    expect(mockedPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { active: false },
    });
  });

  it("countStats() runs total/active/eligible counts in parallel", async () => {
    // Arrange
    mockedPrisma.employee.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(5);

    // Act
    const result = await employeeRepository.countStats();

    // Assert
    expect(result).toEqual({ total: 10, active: 8, eligible: 5 });
    expect(mockedPrisma.employee.count).toHaveBeenNthCalledWith(1);
    expect(mockedPrisma.employee.count).toHaveBeenNthCalledWith(2, { where: { active: true } });
    expect(mockedPrisma.employee.count).toHaveBeenNthCalledWith(3, {
      where: { active: true, eligible: true },
    });
  });

  it("markAsWinner() sets lastWinnerDate to a fresh timestamp for the given employee", async () => {
    // Act
    await employeeRepository.markAsWinner(10);

    // Assert
    expect(mockedPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { lastWinnerDate: expect.any(Date) },
    });
  });

  it("markAsWinner() accepts an explicit transaction client in place of the default shared one", async () => {
    // Arrange
    const tx = { employee: { update: jest.fn() } } as never;

    // Act
    await employeeRepository.markAsWinner(10, tx);

    // Assert
    expect((tx as { employee: { update: jest.Mock } }).employee.update).toHaveBeenCalled();
    expect(mockedPrisma.employee.update).not.toHaveBeenCalled();
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

  it("findById() accepts an explicit transaction client in place of the default shared one", async () => {
    // Arrange
    const tx = { device: { findUnique: jest.fn() } } as never;

    // Act
    await deviceRepository.findById(5, tx);

    // Assert
    expect((tx as { device: { findUnique: jest.Mock } }).device.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
    });
    expect(mockedPrisma.device.findUnique).not.toHaveBeenCalled();
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

  it("countByStatus() groups by status and defaults every status to 0", async () => {
    // Arrange — only 2 of the 4 statuses have any rows.
    mockedPrisma.device.groupBy.mockResolvedValue([
      { status: "AVAILABLE", _count: { _all: 7 } },
      { status: "REMOVED", _count: { _all: 2 } },
    ]);

    // Act
    const result = await deviceRepository.countByStatus();

    // Assert
    expect(result).toEqual({ AVAILABLE: 7, REMOVED: 2, DRAWN: 0, SOLD: 0 });
    expect(mockedPrisma.device.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      _count: { _all: true },
    });
  });

  it("markDrawn() sets the device's status to DRAWN", async () => {
    // Act
    await deviceRepository.markDrawn(1);

    // Assert
    expect(mockedPrisma.device.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "DRAWN" },
    });
  });

  it("markDrawn() accepts an explicit transaction client in place of the default shared one", async () => {
    // Arrange
    const tx = { device: { update: jest.fn() } } as never;

    // Act
    await deviceRepository.markDrawn(1, tx);

    // Assert
    expect((tx as { device: { update: jest.Mock } }).device.update).toHaveBeenCalled();
    expect(mockedPrisma.device.update).not.toHaveBeenCalled();
  });

  it("lockForUpdate() issues a locking read against the device row", async () => {
    // Arrange
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]) } as never;

    // Act
    await deviceRepository.lockForUpdate(1, tx);

    // Assert
    expect((tx as { $queryRaw: jest.Mock }).$queryRaw).toHaveBeenCalled();
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

  it("findById() queries by id", async () => {
    // Act
    await registrationRepository.findById(1);

    // Assert
    expect(mockedPrisma.registration.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("findAllForAdmin() queries with no filter by default, newest first, joined with employee and device", async () => {
    // Act
    await registrationRepository.findAllForAdmin({});

    // Assert
    expect(mockedPrisma.registration.findMany).toHaveBeenCalledWith({
      where: { status: undefined, deviceId: undefined, employeeId: undefined },
      orderBy: { submittedAt: "desc" },
      include: {
        employee: { select: { id: true, staffNumber: true, name: true, department: true } },
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

  it("findAllForAdmin() filters by status/deviceId/employeeId when given", async () => {
    // Act
    await registrationRepository.findAllForAdmin({ status: "WITHDRAWN", deviceId: 1, employeeId: 10 });

    // Assert
    expect(mockedPrisma.registration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "WITHDRAWN", deviceId: 1, employeeId: 10 },
      }),
    );
  });

  it("findAllForAdmin() adds an OR search across employee name/staffNumber and device assetTag when a search term is given", async () => {
    // Act
    await registrationRepository.findAllForAdmin({ search: "Jane" });

    // Assert
    expect(mockedPrisma.registration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { employee: { name: { contains: "Jane" } } },
            { employee: { staffNumber: { contains: "Jane" } } },
            { device: { assetTag: { contains: "Jane" } } },
          ],
        }),
      }),
    );
  });

  it("updateStatus() updates the given registration's status by id", async () => {
    // Act
    await registrationRepository.updateStatus(1, "WITHDRAWN");

    // Assert
    expect(mockedPrisma.registration.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "WITHDRAWN" },
    });
  });

  it("countByStatus() groups by status and defaults every status to 0", async () => {
    // Arrange — only 1 of the 4 statuses has any rows.
    mockedPrisma.registration.groupBy.mockResolvedValue([{ status: "ELIGIBLE", _count: { _all: 3 } }]);

    // Act
    const result = await registrationRepository.countByStatus();

    // Assert
    expect(result).toEqual({ PENDING: 0, ELIGIBLE: 3, INELIGIBLE: 0, WITHDRAWN: 0 });
    expect(mockedPrisma.registration.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      _count: { _all: true },
    });
  });

  it("findEligibleByDeviceId() queries ELIGIBLE registrations for the device", async () => {
    // Act
    await registrationRepository.findEligibleByDeviceId(1);

    // Assert
    expect(mockedPrisma.registration.findMany).toHaveBeenCalledWith({
      where: { deviceId: 1, status: "ELIGIBLE" },
    });
  });
});

describe("drawRepository", () => {
  it("create() persists a new draw", async () => {
    // Arrange
    const data = { deviceId: 1, rngSeed: "seed", candidatePoolSnapshot: [10, 11], drawnByAdminId: 1 };

    // Act
    await drawRepository.create(data);

    // Assert
    expect(mockedPrisma.draw.create).toHaveBeenCalledWith({ data });
  });

  it("create() accepts an explicit transaction client in place of the default shared one", async () => {
    // Arrange
    const tx = { draw: { create: jest.fn() } } as never;
    const data = { deviceId: 1, rngSeed: "seed", candidatePoolSnapshot: [10], drawnByAdminId: 1 };

    // Act
    await drawRepository.create(data, tx);

    // Assert
    expect((tx as { draw: { create: jest.Mock } }).draw.create).toHaveBeenCalledWith({ data });
    expect(mockedPrisma.draw.create).not.toHaveBeenCalled();
  });

  it("createWinner() persists a new winner", async () => {
    // Arrange
    const data = { employeeId: 10, deviceId: 1, drawId: 100, priceDue: "150.00" };

    // Act
    await drawRepository.createWinner(data as never);

    // Assert
    expect(mockedPrisma.winner.create).toHaveBeenCalledWith({ data });
  });

  it("createWinner() passes redrawOf/redrawReason through when given (a redraw replacement)", async () => {
    // Arrange
    const data = {
      employeeId: 11,
      deviceId: 1,
      drawId: 100,
      priceDue: "150.00",
      redrawOf: 1,
      redrawReason: "NON_PAYMENT",
    };

    // Act
    await drawRepository.createWinner(data as never);

    // Assert
    expect(mockedPrisma.winner.create).toHaveBeenCalledWith({ data });
  });

  it("createWinner() accepts an explicit transaction client in place of the default shared one", async () => {
    // Arrange
    const tx = { winner: { create: jest.fn() } } as never;
    const data = { employeeId: 10, deviceId: 1, drawId: 100, priceDue: "150.00" };

    // Act
    await drawRepository.createWinner(data as never, tx);

    // Assert
    expect((tx as { winner: { create: jest.Mock } }).winner.create).toHaveBeenCalledWith({ data });
    expect(mockedPrisma.winner.create).not.toHaveBeenCalled();
  });

  it("findByIdWithWinners() queries a draw by id, including winners and their employee context", async () => {
    // Act
    await drawRepository.findByIdWithWinners(100);

    // Assert
    expect(mockedPrisma.draw.findUnique).toHaveBeenCalledWith({
      where: { id: 100 },
      include: {
        winners: {
          select: {
            id: true,
            employeeId: true,
            deviceId: true,
            drawId: true,
            priceDue: true,
            paymentStatus: true,
            employee: { select: { id: true, staffNumber: true, name: true, department: true } },
          },
        },
      },
    });
  });

  it("lockForUpdate() issues a locking read against the draw row", async () => {
    // Arrange
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]) } as never;

    // Act
    await drawRepository.lockForUpdate(100, tx);

    // Assert
    expect((tx as { $queryRaw: jest.Mock }).$queryRaw).toHaveBeenCalled();
  });
});

describe("winnerRepository", () => {
  it("findAllForAdmin() queries with no filter by default, newest draw first, joined with employee and device", async () => {
    // Act
    await winnerRepository.findAllForAdmin({});

    // Assert
    expect(mockedPrisma.winner.findMany).toHaveBeenCalledWith({
      where: { deviceId: undefined, employeeId: undefined, paymentStatus: undefined },
      orderBy: { drawDate: "desc" },
      include: {
        employee: { select: { id: true, staffNumber: true, name: true, department: true } },
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

  it("findAllForAdmin() filters by deviceId/employeeId/paymentStatus when given", async () => {
    // Act
    await winnerRepository.findAllForAdmin({ deviceId: 1, employeeId: 10, paymentStatus: "PAID" });

    // Assert
    expect(mockedPrisma.winner.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId: 1, employeeId: 10, paymentStatus: "PAID" },
      }),
    );
  });

  it("findById() queries by id", async () => {
    // Act
    await winnerRepository.findById(1);

    // Assert
    expect(mockedPrisma.winner.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("findByRedrawOf() queries for a winner whose redrawOf points at the given id", async () => {
    // Act
    await winnerRepository.findByRedrawOf(5);

    // Assert
    expect(mockedPrisma.winner.findFirst).toHaveBeenCalledWith({ where: { redrawOf: 5 } });
  });

  it("updatePayment() updates the given winner's payment fields", async () => {
    // Arrange
    const paymentDate = new Date("2026-01-01T00:00:00.000Z");

    // Act
    await winnerRepository.updatePayment(1, {
      paymentStatus: "PAID",
      paymentMethod: "Payroll deduction",
      paymentDate,
    });

    // Assert
    expect(mockedPrisma.winner.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { paymentStatus: "PAID", paymentMethod: "Payroll deduction", paymentDate },
    });
  });

  it("updateHandover() sets the given winner's handoverDate", async () => {
    // Arrange
    const handoverDate = new Date("2026-01-01T00:00:00.000Z");

    // Act
    await winnerRepository.updateHandover(1, handoverDate);

    // Assert
    expect(mockedPrisma.winner.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { handoverDate },
    });
  });

});

describe("auditLogRepository", () => {
  it("create() persists a new audit log entry", async () => {
    // Arrange
    const data = { adminId: 1, action: "REDRAW_WINNER", entity: "Winner", entityId: 5 };

    // Act
    await auditLogRepository.create(data);

    // Assert
    expect(mockedPrisma.auditLog.create).toHaveBeenCalledWith({ data });
  });

  it("accepts an explicit transaction client in place of the default shared one", async () => {
    // Arrange
    const tx = { auditLog: { create: jest.fn() } } as never;
    const data = { adminId: 1, action: "REDRAW_WINNER", entity: "Winner", entityId: 5 };

    // Act
    await auditLogRepository.create(data, tx);

    // Assert
    expect((tx as { auditLog: { create: jest.Mock } }).auditLog.create).toHaveBeenCalledWith({ data });
    expect(mockedPrisma.auditLog.create).not.toHaveBeenCalled();
  });
});
