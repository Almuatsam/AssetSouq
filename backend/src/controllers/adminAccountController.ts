import type { NextFunction, Request, Response } from "express";

import { adminAccountService } from "../services/adminAccountService";
import { requireAdminId } from "../utils/requestUtils";
import { changeAdminCredentialsSchema } from "../validators/adminAccountValidators";

export const adminAccountController = {
  async changeCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      // Always the caller's own account, never an id taken from the
      // request body, so there's no way to target another admin's
      // credentials from here.
      const adminId = requireAdminId(req);
      const input = changeAdminCredentialsSchema.parse(req.body);
      const admin = await adminAccountService.changeInitialCredentials(adminId, input);
      res.json({ success: true, data: { admin } });
    } catch (err) {
      next(err);
    }
  },
};
