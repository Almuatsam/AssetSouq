import { Router } from "express";

import { adminDashboardController } from "../controllers/adminDashboardController";
import { authenticate, requireRole } from "../middlewares/auth";
import { adminDashboardReadRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/stats", adminDashboardReadRateLimiter, adminDashboardController.stats);

export { router as adminDashboardRouter };
