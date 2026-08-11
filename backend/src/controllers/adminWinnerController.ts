import type { NextFunction, Request, Response } from "express";

import { winnerService } from "../services/winnerService";
import { listWinnersQuerySchema } from "../validators/adminWinnerValidators";

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
};
