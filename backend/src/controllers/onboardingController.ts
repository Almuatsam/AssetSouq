import type { NextFunction, Request, Response } from "express";

import { onboardingService } from "../services/onboardingService";
import { requireUserIdentity } from "../utils/requestUtils";
import { updateOnboardingSchema } from "../validators/onboardingValidators";

export const onboardingController = {
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const identity = requireUserIdentity(req);
      const progress = await onboardingService.getOrCreateForUser(identity);
      res.json({ success: true, data: { progress } });
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const identity = requireUserIdentity(req);
      const patch = updateOnboardingSchema.parse(req.body);
      const progress = await onboardingService.updateForUser(identity, patch);
      res.json({ success: true, data: { progress } });
    } catch (err) {
      next(err);
    }
  },
};
