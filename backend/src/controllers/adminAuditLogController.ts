import type { NextFunction, Request, Response } from "express";

import { auditLogService } from "../services/auditLogService";
import { listAuditLogsQuerySchema } from "../validators/adminAuditLogValidators";

export const adminAuditLogController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = listAuditLogsQuerySchema.parse(req.query);
      const auditLogs = await auditLogService.listAll(filters);
      res.json({ success: true, data: { auditLogs } });
    } catch (err) {
      next(err);
    }
  },
};
