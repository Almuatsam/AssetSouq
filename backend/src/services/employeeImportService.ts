import ExcelJS from "exceljs";
import { z } from "zod";

import { AppError, describeUniqueConstraintViolation } from "../middlewares/errorHandler";
import { employeeRepository } from "../repositories/employeeRepository";
import { assertSafeZipUncompressedSize } from "../utils/zipSizeGuard";

// Column labels are matched case-insensitively, trimmed — "Staff Number",
// "Email" etc. are required; the rest are optional (a row that omits them
// leaves that field untouched on update, or falls back to the schema
// default on create).
const REQUIRED_COLUMNS = ["staff number", "name", "department", "email"] as const;
const OPTIONAL_BOOLEAN_COLUMNS = ["active", "laptop holder", "eligible"] as const;

// Sanity ceiling on a single import — this is meant for occasional HR
// exports (dozens to low hundreds of rows), not a data migration tool.
// Each row is 1-2 sequential DB round-trips (see importEmployees below,
// where the two independent pre-check reads run in parallel but the
// create/update still has to happen one row at a time — see that
// function's own comment for why), so an unbounded file would turn one
// request into a very long, rate-limiter-defeating operation.
const MAX_IMPORT_ROWS = 1000;

// Bounds what a 5MB compressed upload (middlewares/upload.ts's multer
// limit) is allowed to inflate to — an .xlsx is a zip archive, and
// without this a small, highly compressible file could otherwise expand
// to gigabytes in memory the moment exceljs/JSZip decompresses it. See
// utils/zipSizeGuard.ts.
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

const employeeImportRowSchema = z.object({
  staffNumber: z.string().trim().min(1, "Staff number is required"),
  name: z.string().trim().min(1, "Name is required"),
  department: z.string().trim().min(1, "Department is required"),
  email: z.string().trim().email("Invalid email address"),
  active: z.boolean().optional(),
  laptopHolder: z.boolean().optional(),
  eligible: z.boolean().optional(),
});
type EmployeeImportRow = z.infer<typeof employeeImportRowSchema>;

export interface EmployeeImportRowError {
  row: number;
  message: string;
}

export interface EmployeeImportSummary {
  created: number;
  updated: number;
  errors: EmployeeImportRowError[];
}

// ExcelJS surfaces some cell values as an object rather than a plain
// string — a hyperlinked cell (Excel auto-links anything that looks like
// an email/URL as you type it) as `{ text, hyperlink }`, and a cell with
// any character-level formatting (bold/colored substring — plausible for
// a `name` column, not just email) as `{ richText: [{ text }, ...] }`.
// Falling through to `String(value)` on either shape produces the literal
// string "[object Object]", which — for staffNumber/name/department, none
// of which are format-validated the way email is — would otherwise pass
// Zod's non-empty check and get silently written to the DB as garbage.
function cellText(row: ExcelJS.Row, colNumber: number | undefined): string {
  if (!colNumber) return "";
  const value = row.getCell(colNumber).value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value) {
      return String((value as { text: unknown }).text ?? "").trim();
    }
    if ("richText" in value && Array.isArray((value as { richText: unknown }).richText)) {
      return (value as { richText: Array<{ text?: unknown }> }).richText
        .map((fragment) => String(fragment.text ?? ""))
        .join("")
        .trim();
    }
  }
  return String(value).trim();
}

function cellBoolean(row: ExcelJS.Row, colNumber: number | undefined): boolean {
  if (!colNumber) return false;
  const value = row.getCell(colNumber).value;
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "y";
}

function isRowEmpty(row: ExcelJS.Row): boolean {
  let empty = true;
  row.eachCell({ includeEmpty: false }, () => {
    empty = false;
  });
  return empty;
}

interface ParsedWorkbook {
  rows: Array<{ rowNumber: number; data: EmployeeImportRow }>;
  errors: EmployeeImportRowError[];
}

async function parseEmployeeWorkbook(buffer: Buffer): Promise<ParsedWorkbook> {
  // Runs before exceljs ever decompresses anything — see the constant's
  // comment and utils/zipSizeGuard.ts. Deliberately outside the try/catch
  // below so its specific AppError message reaches the client instead of
  // being swallowed by the generic "could not read" fallback.
  assertSafeZipUncompressedSize(buffer, MAX_UNCOMPRESSED_BYTES);

  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs's own index.d.ts declares `declare interface Buffer extends
    // ArrayBuffer {}` at module scope, which merges into (and corrupts)
    // the ambient global `Buffer` type for this whole program the moment
    // exceljs's types are loaded — not a real runtime concern, since
    // multer's `req.file.buffer` is always a genuine Node Buffer, but it
    // means even `buffer as unknown as Buffer` fails this specific
    // structural check. @ts-expect-error (rather than an `any` cast) so
    // this line starts failing the build — self-flagging that the
    // workaround can be deleted — the moment a future exceljs release
    // fixes its own types.
    // @ts-expect-error — see comment above; exceljs's own type declaration bug, not a real type mismatch
    await workbook.xlsx.load(buffer);
  } catch {
    throw new AppError(400, "Could not read the uploaded file — expected a valid .xlsx workbook");
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new AppError(400, "The uploaded workbook has no worksheet");
  }

  const headerMap: Record<string, number> = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const label = String(cell.value ?? "").trim().toLowerCase();
    if (label) headerMap[label] = colNumber;
  });

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !(column in headerMap));
  if (missingColumns.length > 0) {
    throw new AppError(400, `Missing required column(s): ${missingColumns.join(", ")}`);
  }

  // `rowCount` (used as the loop bound below) is the *highest row index*
  // touched by anything, including formatting-only cells far past the
  // real data — a single styled A5000 from a banded/templated HR export
  // is enough to inflate it to 5000 with only a handful of actual data
  // rows. `actualRowCount` is the true count of rows holding data, which
  // is what this cap needs to measure — checking it against `rowCount`
  // instead would spuriously reject a small legitimate file just because
  // of stray formatting far beyond where the data ends.
  if (worksheet.actualRowCount - 1 > MAX_IMPORT_ROWS) {
    throw new AppError(400, `Too many rows — a single import is limited to ${MAX_IMPORT_ROWS}`);
  }

  const rows: ParsedWorkbook["rows"] = [];
  const errors: EmployeeImportRowError[] = [];

  // Bounded by `rowCount` (the true highest row index), not
  // `actualRowCount` (a count, not an index) — a sparse file with real
  // data past a gap of empty/formatting-only rows would otherwise get
  // truncated. `isRowEmpty` below makes iterating the gap cheap.
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (isRowEmpty(row)) continue;

    const candidate: Record<string, unknown> = {
      staffNumber: cellText(row, headerMap["staff number"]),
      name: cellText(row, headerMap["name"]),
      department: cellText(row, headerMap["department"]),
      email: cellText(row, headerMap["email"]),
    };
    for (const column of OPTIONAL_BOOLEAN_COLUMNS) {
      if (column in headerMap) {
        const key = column === "laptop holder" ? "laptopHolder" : column;
        candidate[key] = cellBoolean(row, headerMap[column]);
      }
    }

    const parsed = employeeImportRowSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({ row: rowNumber, message: parsed.error.issues.map((issue) => issue.message).join("; ") });
      continue;
    }
    rows.push({ rowNumber, data: parsed.data });
  }

  return { rows, errors };
}

export const employeeImportService = {
  // Rows are processed sequentially (not in parallel) purely for the
  // create/update step — this is what makes two rows in the same file
  // sharing a staffNumber behave as create-then-update rather than a race
  // (the second row's findByStaffNumber() sees the first row's just-
  // created record), keeps each row's error isolated to itself rather
  // than aborting the whole import, and avoids opening up to
  // MAX_IMPORT_ROWS concurrent connections against Prisma's pool. The two
  // read pre-checks below don't depend on each other, though, so those
  // run in parallel per row.
  async importEmployees(buffer: Buffer): Promise<EmployeeImportSummary> {
    const { rows, errors: parseErrors } = await parseEmployeeWorkbook(buffer);
    const errors = [...parseErrors];
    let created = 0;
    let updated = 0;

    for (const { rowNumber, data } of rows) {
      try {
        const [existing, emailTaken] = await Promise.all([
          employeeRepository.findByStaffNumber(data.staffNumber),
          employeeRepository.findByEmail(data.email),
        ]);
        if (emailTaken && emailTaken.id !== existing?.id) {
          throw new AppError(409, `Email ${data.email} is already used by another employee`);
        }

        if (existing) {
          await employeeRepository.update(existing.id, {
            name: data.name,
            department: data.department,
            email: data.email,
            ...(data.active !== undefined ? { active: data.active } : {}),
            ...(data.laptopHolder !== undefined ? { laptopHolder: data.laptopHolder } : {}),
            ...(data.eligible !== undefined ? { eligible: data.eligible } : {}),
          });
          updated += 1;
        } else {
          await employeeRepository.create({
            staffNumber: data.staffNumber,
            name: data.name,
            department: data.department,
            email: data.email,
            ...(data.active !== undefined ? { active: data.active } : {}),
            laptopHolder: data.laptopHolder ?? false,
            eligible: data.eligible ?? true,
          });
          created += 1;
        }
      } catch (err) {
        // Covers the same P2002 race errorHandler.ts's own backstop
        // handles for every other create/update path — two rows in
        // different concurrent imports both passing this row's pre-checks
        // before either write lands. Falls through to a logged, generic
        // message for anything else, so a genuine bug during import still
        // leaves a trace instead of silently collapsing to "Unexpected
        // error".
        const uniqueConstraintMessage = describeUniqueConstraintViolation(err);
        if (uniqueConstraintMessage) {
          errors.push({ row: rowNumber, message: uniqueConstraintMessage });
        } else if (err instanceof AppError) {
          errors.push({ row: rowNumber, message: err.message });
        } else {
          console.error(`Employee import row ${rowNumber} failed unexpectedly:`, err);
          errors.push({ row: rowNumber, message: "Unexpected error" });
        }
      }
    }

    return { created, updated, errors };
  },
};
