import type { NextFunction, Request, Response } from "express";

import { drawService } from "../services/drawService";
import { winnerService } from "../services/winnerService";
import { requireAdminId } from "../utils/requestUtils";
// redrawWinnerSchema lives in adminDrawValidators.ts, not this
// controller's own adminWinnerValidators.ts — deliberate, not a stray
// import: the redraw operation is implemented in services/drawService.ts
// (it re-runs the original draw's candidate selection), so its schema is
// grouped with the rest of that domain's validators even though the route
// itself is mounted under /admin/winners/:id/redraw.
import { redrawWinnerSchema } from "../validators/adminDrawValidators";
import { listWinnersQuerySchema, recordPaymentSchema } from "../validators/adminWinnerValidators";
import { idParamSchema } from "../validators/commonValidators";

export const adminWinnerController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = listWinnersQuerySchema.parse(req.query);
      const winners = await winnerService.listAllForAdmin(filters);
      res.json({ success: true, data: { winners } });
    } catch (err) {
      next(err);
    }
  },

  async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const input = recordPaymentSchema.parse(req.body);
      const winner = await winnerService.recordPayment(id, input);
      res.json({ success: true, data: { winner } });
    } catch (err) {
      next(err);
    }
  },

  async recordHandover(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const winner = await winnerService.recordHandover(id);
      res.json({ success: true, data: { winner } });
    } catch (err) {
      next(err);
    }
  },

  async redraw(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = requireAdminId(req);
      const { id } = idParamSchema.parse(req.params);
      const { reason } = redrawWinnerSchema.parse(req.body);
      const winner = await drawService.redrawWinner(id, reason, adminId);
      res.status(201).json({ success: true, data: { winner } });
    } catch (err) {
      next(err);
    }
  },
};
