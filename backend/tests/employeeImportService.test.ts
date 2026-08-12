import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";

import { employeeRepository } from "../src/repositories/employeeRepository";
import { AppError } from "../src/middlewares/errorHandler";
import { employeeImportService } from "../src/services/employeeImportService";

jest.mock("../src/repositories/employeeRepository");

const mockedEmployeeRepo = employeeRepository as jest.Mocked<typeof employeeRepository>;

async function buildWorkbook(headers: string[], rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Employees");
  sheet.addRow(headers);
  for (const row of rows) {
    sheet.addRow(row);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const FULL_HEADERS = ["Staff Number", "Name", "Department", "Email", "Active", "Laptop Holder", "Eligible"];
const REQUIRED_HEADERS = ["Staff Number", "Name", "Department", "Email"];

const baseEmployee = {
  id: 1,
  staffNumber: "S1001",
  name: "Jane Doe",
  department: "Engineering",
  email: "jane.doe@example.com",
  active: true,
  laptopHolder: false,
  lastWinnerDate: null,
  eligible: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("employeeImportService.importEmployees", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws a 400 AppError when a required column is missing", async () => {
    // Arrange
    const buffer = await buildWorkbook(["Staff Number", "Name", "Department"], [["S1001", "Jane", "Eng"]]);

    // Act / Assert
    await expect(employeeImportService.importEmployees(buffer)).rejects.toThrow(
      /Missing required column\(s\): email/i,
    );
  });

  it("throws a 400 AppError when the file isn't a readable workbook", async () => {
    // Act / Assert
    await expect(employeeImportService.importEmployees(Buffer.from("not an xlsx"))).rejects.toThrow(
      /could not read the uploaded file/i,
    );
  });

  it("throws a 400 AppError when exceljs itself can't parse a structurally zip-like file", async () => {
    // Arrange — this has a well-formed enough central directory + EOCD to
    // pass the zipSizeGuard pre-check (see zipSizeGuard.test.ts's
    // buildFakeZipBuffer), but no matching local file entries or OOXML
    // parts, so exceljs's own load() fails on it — the load()-specific
    // catch block, not the size guard, is what should catch this one.
    const fileName = Buffer.from("sheet1.xml");
    const centralDir = Buffer.alloc(46 + fileName.length);
    centralDir.writeUInt32LE(0x02014b50, 0);
    centralDir.writeUInt32LE(10, 20);
    centralDir.writeUInt32LE(10, 24);
    centralDir.writeUInt16LE(fileName.length, 28);
    fileName.copy(centralDir, 46);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(centralDir.length, 12);
    eocd.writeUInt32LE(0, 16);
    const buffer = Buffer.concat([centralDir, eocd]);

    // Act / Assert
    await expect(employeeImportService.importEmployees(buffer)).rejects.toThrow(
      /could not read the uploaded file/i,
    );
  });

  it("throws a 400 AppError when the workbook has more rows than the import cap allows", async () => {
    // Arrange
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Employees");
    sheet.addRow(REQUIRED_HEADERS);
    for (let i = 0; i < 1001; i++) {
      sheet.addRow([`S${i}`, `Employee ${i}`, "Engineering", `employee${i}@example.com`]);
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    // Act / Assert
    await expect(employeeImportService.importEmployees(buffer)).rejects.toThrow(/too many rows/i);
  });

  it("rejects a file that would decompress far beyond its upload size (zip-bomb guard)", async () => {
    // Arrange — a single central-directory entry declaring 200MB
    // uncompressed, hand-built the same way tests/zipSizeGuard.test.ts
    // does, since a real decompression bomb isn't practical to construct
    // in a unit test.
    const fileName = Buffer.from("sheet1.xml");
    const centralDir = Buffer.alloc(46 + fileName.length);
    centralDir.writeUInt32LE(0x02014b50, 0);
    centralDir.writeUInt32LE(100, 20);
    centralDir.writeUInt32LE(200 * 1024 * 1024, 24);
    centralDir.writeUInt16LE(fileName.length, 28);
    fileName.copy(centralDir, 46);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(centralDir.length, 12);
    eocd.writeUInt32LE(0, 16);
    const buffer = Buffer.concat([centralDir, eocd]);

    // Act / Assert
    await expect(employeeImportService.importEmployees(buffer)).rejects.toThrow(
      /too large once decompressed/i,
    );
    expect(mockedEmployeeRepo.findByStaffNumber).not.toHaveBeenCalled();
  });

  it("creates a new employee for a row whose staff number doesn't exist yet", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockResolvedValue(baseEmployee as never);
    const buffer = await buildWorkbook(
      REQUIRED_HEADERS,
      [["S1001", "Jane Doe", "Engineering", "jane.doe@example.com"]],
    );

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary).toEqual({ created: 1, updated: 0, errors: [] });
    expect(mockedEmployeeRepo.create).toHaveBeenCalledWith({
      staffNumber: "S1001",
      name: "Jane Doe",
      department: "Engineering",
      email: "jane.doe@example.com",
      laptopHolder: false,
      eligible: true,
    });
  });

  it("reads a hyperlinked email cell's display text rather than failing validation", async () => {
    // Arrange — mirrors how Excel auto-links a typed email address into a
    // `{ text, hyperlink }` cell value instead of a plain string.
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockResolvedValue(baseEmployee as never);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Employees");
    sheet.addRow(REQUIRED_HEADERS);
    const row = sheet.addRow(["S1001", "Jane Doe", "Engineering"]);
    row.getCell(4).value = { text: "jane.doe@example.com", hyperlink: "mailto:jane.doe@example.com" };
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary).toEqual({ created: 1, updated: 0, errors: [] });
    expect(mockedEmployeeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jane.doe@example.com" }),
    );
  });

  it("reads a rich-text-formatted cell's concatenated text rather than failing validation", async () => {
    // Arrange — mirrors how Excel stores a cell with any character-level
    // formatting (e.g. part of a name bolded) as `{ richText: [...] }`
    // instead of a plain string.
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockResolvedValue(baseEmployee as never);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Employees");
    sheet.addRow(REQUIRED_HEADERS);
    const row = sheet.addRow(["S1001", null, "Engineering", "jane.doe@example.com"]);
    row.getCell(2).value = {
      richText: [{ text: "Jane " }, { text: "Doe", font: { bold: true } }],
    };
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary).toEqual({ created: 1, updated: 0, errors: [] });
    expect(mockedEmployeeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Jane Doe" }),
    );
  });

  it("reports a unique-constraint race as its underlying field, not a generic error", async () => {
    // Arrange — a row that passes both pre-checks (e.g. beaten by a
    // concurrent import) but whose create() then hits the DB's own
    // unique index.
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["staffNumber"] },
      }),
    );
    const buffer = await buildWorkbook(
      REQUIRED_HEADERS,
      [["S1001", "Jane Doe", "Engineering", "jane.doe@example.com"]],
    );

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary).toEqual({
      created: 0,
      updated: 0,
      errors: [{ row: 2, message: "A record with this staffNumber already exists" }],
    });
  });

  it("logs and records a generic message for a non-AppError, non-Prisma repository failure", async () => {
    // Arrange
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockRejectedValue(new Error("connection reset"));
    const buffer = await buildWorkbook(
      REQUIRED_HEADERS,
      [["S1001", "Jane Doe", "Engineering", "jane.doe@example.com"]],
    );

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary).toEqual({
      created: 0,
      updated: 0,
      errors: [{ row: 2, message: "Unexpected error" }],
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Employee import row 2 failed unexpectedly"),
      expect.any(Error),
    );

    // Cleanup
    consoleErrorSpy.mockRestore();
  });

  it("applies optional boolean columns on create when present", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockResolvedValue(baseEmployee as never);
    const buffer = await buildWorkbook(
      FULL_HEADERS,
      [["S1001", "Jane Doe", "Engineering", "jane.doe@example.com", "false", "true", "false"]],
    );

    // Act
    await employeeImportService.importEmployees(buffer);

    // Assert
    expect(mockedEmployeeRepo.create).toHaveBeenCalledWith({
      staffNumber: "S1001",
      name: "Jane Doe",
      department: "Engineering",
      email: "jane.doe@example.com",
      active: false,
      laptopHolder: true,
      eligible: false,
    });
  });

  it("updates an existing employee matched by staff number", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(baseEmployee as never);
    mockedEmployeeRepo.update.mockResolvedValue({ ...baseEmployee, department: "Sales" } as never);
    const buffer = await buildWorkbook(
      REQUIRED_HEADERS,
      [["S1001", "Jane Doe", "Sales", "jane.doe@example.com"]],
    );

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary).toEqual({ created: 0, updated: 1, errors: [] });
    expect(mockedEmployeeRepo.update).toHaveBeenCalledWith(1, {
      name: "Jane Doe",
      department: "Sales",
      email: "jane.doe@example.com",
    });
  });

  it("records a row-level error and continues when a row fails validation", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockResolvedValue(baseEmployee as never);
    const buffer = await buildWorkbook(REQUIRED_HEADERS, [
      ["S1001", "Jane Doe", "Engineering", "not-an-email"],
      ["S1002", "John Smith", "Sales", "john.smith@example.com"],
    ]);

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary.created).toBe(1);
    expect(summary.errors).toEqual([{ row: 2, message: expect.stringMatching(/invalid email/i) }]);
    expect(mockedEmployeeRepo.create).toHaveBeenCalledTimes(1);
  });

  it("records a row-level error when the email belongs to a different employee", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue({ ...baseEmployee, id: 99 } as never);
    const buffer = await buildWorkbook(
      REQUIRED_HEADERS,
      [["S1002", "John Smith", "Sales", "jane.doe@example.com"]],
    );

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary).toEqual({
      created: 0,
      updated: 0,
      errors: [{ row: 2, message: expect.stringMatching(/already used by another employee/i) }],
    });
    expect(mockedEmployeeRepo.create).not.toHaveBeenCalled();
  });

  it("skips fully blank rows", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockResolvedValue(baseEmployee as never);
    const buffer = await buildWorkbook(REQUIRED_HEADERS, [
      [],
      ["S1001", "Jane Doe", "Engineering", "jane.doe@example.com"],
    ]);

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary).toEqual({ created: 1, updated: 0, errors: [] });
  });

  it("wraps an unexpected repository failure as a row-level error instead of aborting the import", async () => {
    // Arrange
    mockedEmployeeRepo.findByStaffNumber.mockResolvedValue(null);
    mockedEmployeeRepo.findByEmail.mockResolvedValue(null);
    mockedEmployeeRepo.create.mockRejectedValueOnce(new AppError(409, "A record with this email already exists"));
    mockedEmployeeRepo.create.mockResolvedValueOnce(baseEmployee as never);
    const buffer = await buildWorkbook(REQUIRED_HEADERS, [
      ["S1001", "Jane Doe", "Engineering", "jane.doe@example.com"],
      ["S1002", "John Smith", "Sales", "john.smith@example.com"],
    ]);

    // Act
    const summary = await employeeImportService.importEmployees(buffer);

    // Assert
    expect(summary.created).toBe(1);
    expect(summary.errors).toEqual([
      { row: 2, message: "A record with this email already exists" },
    ]);
  });
});
