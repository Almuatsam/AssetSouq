import type { NextFunction, Request, Response } from "express";

import { dashboardService } from "../services/dashboardService";

export const adminDashboardController = {
  async stats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getStats();
      res.json({ success: true, data: { stats } });
    } catch (err) {
      next(err);
    }
  },
};
