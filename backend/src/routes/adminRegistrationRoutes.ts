import { Router } from "express";

import { adminRegistrationController } from "../controllers/adminRegistrationController";
import { authenticate, requireRole } from "../middlewares/auth";
import {
  adminRegistrationReadRateLimiter,
  adminRegistrationWriteRateLimiter,
} from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/", adminRegistrationReadRateLimiter, adminRegistrationController.list);
router.patch("/:id", adminRegistrationWriteRateLimiter, adminRegistrationController.updateStatus);

export { router as adminRegistrationRouter };
