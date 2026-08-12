import multer from "multer";

import { AppError } from "./errorHandler";

const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Memory storage, not disk — the file is parsed once (ExcelJS) and
// discarded (see employeeImportService.ts), so there's nothing worth
// persisting to disk and cleaning up afterwards.
export const employeeImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== XLSX_MIME_TYPE) {
      cb(new AppError(400, "Only .xlsx files are accepted"));
      return;
    }
    cb(null, true);
  },
});
