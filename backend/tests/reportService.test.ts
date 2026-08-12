import ExcelJS from "exceljs";

import { deviceRepository } from "../src/repositories/deviceRepository";
import { employeeRepository } from "../src/repositories/employeeRepository";
import { registrationRepository } from "../src/repositories/registrationRepository";
import { winnerRepository } from "../src/repositories/winnerRepository";
import { reportService } from "../src/services/reportService";

jest.mock("../src/repositories/deviceRepository");
jest.mock("../src/repositories/employeeRepository");
jest.mock("../src/repositories/registrationRepository");
jest.mock("../src/repositories/winnerRepository");

const mockedDeviceRepo = deviceRepository as jest.Mocked<typeof deviceRepository>;
const mockedEmployeeRepo = employeeRepository as jest.Mocked<typeof employeeRepository>;
const mockedRegistrationRepo = registrationRepository as jest.Mocked<typeof registrationRepository>;
const mockedWinnerRepo = winnerRepository as jest.Mocked<typeof winnerRepository>;

async function readSheet(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  const headerRow = sheet.getRow(1).values as unknown[];
  const dataRow = sheet.getRow(2).values as unknown[];
  return { sheetName: sheet.name, headerRow, dataRow, rowCount: sheet.rowCount };
}

describe("reportService.buildDevicesReport", () => {
  beforeEach(() => jest.clearAllMocks());

  it("builds a workbook with a header row and one row per device", async () => {
    // Arrange
    mockedDeviceRepo.findAll.mockResolvedValue([
      {
        id: 1,
        assetTag: "AST-001",
        deviceType: "Laptop",
        brand: "Dell",
        model: "Latitude 5420",
        cpu: "i5",
        ram: "16GB",
        storage: null, // nullable field — also exercises sanitizeText()'s non-string pass-through
        purchaseYear: 2021,
        yearsUsed: 3,
        price: "150.00" as never,
        status: "AVAILABLE",
        quantity: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);

    // Act
    const buffer = await reportService.buildDevicesReport();
    const { sheetName, headerRow, dataRow, rowCount } = await readSheet(buffer);

    // Assert
    expect(sheetName).toBe("Devices");
    expect(rowCount).toBe(2);
    expect(headerRow).toContain("Asset Tag");
    expect(dataRow).toContain("AST-001");
    expect(dataRow).toContain(150);
  });
});

describe("reportService formula-injection sanitization", () => {
  beforeEach(() => jest.clearAllMocks());

  it("prefixes a formula-looking employee name with a leading apostrophe", async () => {
    // Arrange — a name that would otherwise plant a live formula if this
    // workbook were later re-opened/re-exported (see reportService.ts's
    // sanitizeText()).
    mockedEmployeeRepo.findAll.mockResolvedValue([
      {
        id: 1,
        staffNumber: "S1001",
        name: "=cmd|'/c calc'!A1",
        department: "+Engineering",
        email: "jane.doe@example.com",
        active: true,
        laptopHolder: false,
        lastWinnerDate: null,
        eligible: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);

    // Act
    const buffer = await reportService.buildEmployeesReport();
    const { dataRow } = await readSheet(buffer);

    // Assert
    expect(dataRow).toContain("'=cmd|'/c calc'!A1");
    expect(dataRow).toContain("'+Engineering");
  });
});

describe("reportService.buildEmployeesReport", () => {
  beforeEach(() => jest.clearAllMocks());

  it("builds a workbook with a header row and one row per employee", async () => {
    // Arrange
    mockedEmployeeRepo.findAll.mockResolvedValue([
      {
        id: 1,
        staffNumber: "S1001",
        name: "Jane Doe",
        department: "Engineering",
        email: "jane.doe@example.com",
        active: true,
        laptopHolder: false,
        lastWinnerDate: null,
        eligible: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);

    // Act
    const buffer = await reportService.buildEmployeesReport();
    const { sheetName, headerRow, dataRow, rowCount } = await readSheet(buffer);

    // Assert
    expect(sheetName).toBe("Employees");
    expect(rowCount).toBe(2);
    expect(headerRow).toContain("Staff Number");
    expect(dataRow).toContain("S1001");
    expect(mockedEmployeeRepo.findAll).toHaveBeenCalledWith({});
  });
});

describe("reportService.buildRegistrationsReport", () => {
  beforeEach(() => jest.clearAllMocks());

  it("builds a workbook with a header row and one row per registration", async () => {
    // Arrange
    mockedRegistrationRepo.findAllForAdmin.mockResolvedValue([
      {
        id: 1,
        employeeId: 10,
        deviceId: 1,
        agreed: true,
        submittedAt: new Date("2026-01-01T00:00:00.000Z"),
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
      },
    ] as never);

    // Act
    const buffer = await reportService.buildRegistrationsReport();
    const { sheetName, headerRow, dataRow, rowCount } = await readSheet(buffer);

    // Assert
    expect(sheetName).toBe("Registrations");
    expect(rowCount).toBe(2);
    expect(headerRow).toContain("Asset Tag");
    expect(dataRow).toContain("S1001");
    expect(dataRow).toContain("Dell Latitude 5420");
  });
});

describe("reportService.buildWinnersReport", () => {
  beforeEach(() => jest.clearAllMocks());

  it("builds a workbook with a header row and one row per winner", async () => {
    // Arrange
    mockedWinnerRepo.findAllForAdmin.mockResolvedValue([
      {
        id: 1,
        employeeId: 10,
        deviceId: 1,
        drawId: 100,
        drawDate: new Date("2026-01-01T00:00:00.000Z"),
        accepted: false,
        priceDue: "150.00" as never,
        paymentStatus: "PAID",
        paymentDate: new Date("2026-01-02T00:00:00.000Z"),
        paymentMethod: "Payroll deduction",
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
      },
    ] as never);

    // Act
    const buffer = await reportService.buildWinnersReport();
    const { sheetName, headerRow, dataRow, rowCount } = await readSheet(buffer);

    // Assert
    expect(sheetName).toBe("Winners");
    expect(rowCount).toBe(2);
    expect(headerRow).toContain("Payment Status");
    expect(dataRow).toContain("S1001");
    expect(dataRow).toContain(150);
    expect(dataRow).toContain("PAID");
  });
});
