import { AppError } from "../middlewares/errorHandler";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const EOCD_MIN_SIZE = 22;
const CENTRAL_DIR_HEADER_SIZE = 46;
const MAX_EOCD_COMMENT_LENGTH = 0xffff;

// Zip64 sentinel used in the 32-bit size fields when the real size doesn't
// fit — treated as "unknown, assume worst case" rather than implementing
// full zip64 parsing, since a zip64 archive should never legitimately show
// up here (an xlsx built from a spreadsheet-sized employee list).
const ZIP64_SENTINEL = 0xffffffff;

const GENERIC_READ_ERROR = "Could not read the uploaded file — expected a valid .xlsx workbook";

// An .xlsx file is a zip archive — a small *compressed* upload can still
// inflate to gigabytes in memory once a zip reader (JSZip, via exceljs's
// workbook.xlsx.load()) decompresses every entry, so a multer file-size
// limit on the upload alone does not bound that risk.
//
// This reads only the zip's central directory — plain integers, never
// decompressed — to sum each entry's *declared* uncompressed size and
// reject anything that would exceed maxUncompressedBytes, before exceljs
// gets anywhere near actually inflating the archive's contents.
export function assertSafeZipUncompressedSize(buffer: Buffer, maxUncompressedBytes: number): void {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset === -1) {
    throw new AppError(400, GENERIC_READ_ERROR);
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  let totalUncompressed = 0;

  for (let i = 0; i < entryCount; i++) {
    if (offset + CENTRAL_DIR_HEADER_SIZE > buffer.length) {
      throw new AppError(400, GENERIC_READ_ERROR);
    }
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIR_SIGNATURE) {
      throw new AppError(400, GENERIC_READ_ERROR);
    }

    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    if (uncompressedSize === ZIP64_SENTINEL) {
      throw new AppError(400, "The uploaded file's format is not supported");
    }

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > maxUncompressedBytes) {
      throw new AppError(400, "The uploaded file is too large once decompressed");
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    offset += CENTRAL_DIR_HEADER_SIZE + nameLength + extraLength + commentLength;
  }
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  // The EOCD's comment field can itself be up to 65535 bytes, so the
  // record isn't necessarily the file's last 22 bytes — scan backwards
  // from the end for the signature, the same approach every zip reader
  // uses.
  const searchStart = Math.max(0, buffer.length - EOCD_MIN_SIZE - MAX_EOCD_COMMENT_LENGTH);
  for (let i = buffer.length - EOCD_MIN_SIZE; i >= searchStart; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      return i;
    }
  }
  return -1;
}
