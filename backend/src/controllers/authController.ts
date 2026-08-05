import type { NextFunction, Request, Response } from "express";

import { authService } from "../services/authService";
import { adminLoginSchema, employeeLoginSchema } from "../validators/authValidators";

export const authController = {
  async employeeLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { staffNumber } = employeeLoginSchema.parse(req.body);
      const { token, employee } = await authService.loginEmployee(staffNumber);
      res.json({ success: true, data: { token, employee } });
    } catch (err) {
      next(err);
    }
  },

  async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = adminLoginSchema.parse(req.body);
      const { token, admin } = await authService.loginAdmin(username, password);
      res.json({ success: true, data: { token, admin } });
    } catch (err) {
      next(err);
    }
  },

  me(req: Request, res: Response) {
    res.json({ success: true, data: { user: req.user } });
  },
};
