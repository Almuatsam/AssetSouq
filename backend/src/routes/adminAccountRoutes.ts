import { Router } from "express";

import { adminAccountController } from "../controllers/adminAccountController";
import { authenticate, requireRole } from "../middlewares/auth";
import { adminAccountCredentialsRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.patch(
  "/credentials",
  adminAccountCredentialsRateLimiter,
  adminAccountController.changeCredentials,
);

export { router as adminAccountRouter };
