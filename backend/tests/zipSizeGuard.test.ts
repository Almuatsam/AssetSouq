import ExcelJS from "exceljs";

import { assertSafeZipUncompressedSize } from "../src/utils/zipSizeGuard";

const CENTRAL_DIR_HEADER_SIZE = 46;

// Hand-builds the minimal parts of a zip file the guard actually reads —
// one central directory file header followed by the end-of-central-
// directory record — without ever needing a real, fully-formed zip.
function buildFakeZipBuffer(uncompressedSize: number): Buffer {
  const fileName = Buffer.from("sheet1.xml");
  const centralDir = Buffer.alloc(CENTRAL_DIR_HEADER_SIZE + fileName.length);
  centralDir.writeUInt32LE(0x02014b50, 0); // central directory signature
  centralDir.writeUInt32LE(100, 20); // compressed size (small)
  centralDir.writeUInt32LE(uncompressedSize, 24); // uncompressed size
  centralDir.writeUInt16LE(fileName.length, 28); // file name length
  fileName.copy(centralDir, 46);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(1, 10); // total central directory records
  eocd.writeUInt32LE(centralDir.length, 12); // central directory size
  eocd.writeUInt32LE(0, 16); // central directory offset (start of buffer)

  return Buffer.concat([centralDir, eocd]);
}

describe("assertSafeZipUncompressedSize", () => {
  it("allows a real, normally-sized workbook through", async () => {
    // Arrange
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Sheet1").addRow(["a", "b", "c"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    // Act / Assert
    expect(() => assertSafeZipUncompressedSize(buffer, 50 * 1024 * 1024)).not.toThrow();
  });

  it("throws when the declared uncompressed size exceeds the limit", () => {
    // Arrange — a single entry declaring 200MB uncompressed, well past a 50MB limit
    const buffer = buildFakeZipBuffer(200 * 1024 * 1024);

    // Act / Assert
    expect(() => assertSafeZipUncompressedSize(buffer, 50 * 1024 * 1024)).toThrow(
      /too large once decompressed/i,
    );
  });

  it("allows a declared uncompressed size within the limit", () => {
    // Arrange
    const buffer = buildFakeZipBuffer(10 * 1024 * 1024);

    // Act / Assert
    expect(() => assertSafeZipUncompressedSize(buffer, 50 * 1024 * 1024)).not.toThrow();
  });

  it("throws a generic error when the buffer isn't a zip at all", () => {
    // Act / Assert
    expect(() => assertSafeZipUncompressedSize(Buffer.from("not a zip"), 50 * 1024 * 1024)).toThrow(
      /could not read the uploaded file/i,
    );
  });

  it("throws a generic error when a declared entry declares a zip64 sentinel size", () => {
    // Arrange — 0xffffffff signals "see the zip64 extra field instead",
    // which this guard deliberately doesn't parse — treated as unsafe.
    const buffer = buildFakeZipBuffer(0xffffffff);

    // Act / Assert
    expect(() => assertSafeZipUncompressedSize(buffer, 50 * 1024 * 1024)).toThrow(
      /format is not supported/i,
    );
  });

  it("throws a generic error when the central directory is truncated mid-entry", () => {
    // Arrange — EOCD claims one entry, but the buffer is cut off before a
    // full 46-byte central directory header fits.
    const truncatedCentralDir = Buffer.alloc(20);
    truncatedCentralDir.writeUInt32LE(0x02014b50, 0);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(truncatedCentralDir.length, 12);
    eocd.writeUInt32LE(0, 16);
    const buffer = Buffer.concat([truncatedCentralDir, eocd]);

    // Act / Assert
    expect(() => assertSafeZipUncompressedSize(buffer, 50 * 1024 * 1024)).toThrow(
      /could not read the uploaded file/i,
    );
  });

  it("throws a generic error when an entry's signature doesn't match", () => {
    // Arrange — right size, wrong signature.
    const buffer = buildFakeZipBuffer(1024);
    buffer.writeUInt32LE(0xdeadbeef, 0);

    // Act / Assert
    expect(() => assertSafeZipUncompressedSize(buffer, 50 * 1024 * 1024)).toThrow(
      /could not read the uploaded file/i,
    );
  });
});
