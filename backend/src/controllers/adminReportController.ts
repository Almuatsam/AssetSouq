import type { NextFunction, Request, Response } from "express";

import { reportService } from "../services/reportService";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function sendWorkbook(res: Response, filename: string, buffer: Buffer): void {
  res.setHeader("Content-Type", XLSX_CONTENT_TYPE);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

export const adminReportController = {
  async devices(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await reportService.buildDevicesReport();
      sendWorkbook(res, "devices-report.xlsx", buffer);
    } catch (err) {
      next(err);
    }
  },

  async employees(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await reportService.buildEmployeesReport();
      sendWorkbook(res, "employees-report.xlsx", buffer);
    } catch (err) {
      next(err);
    }
  },

  async registrations(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await reportService.buildRegistrationsReport();
      sendWorkbook(res, "registrations-report.xlsx", buffer);
    } catch (err) {
      next(err);
    }
  },

  async winners(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await reportService.buildWinnersReport();
      sendWorkbook(res, "winners-report.xlsx", buffer);
    } catch (err) {
      next(err);
    }
  },
};
