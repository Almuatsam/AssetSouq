import { Router } from "express";

import { adminWinnerController } from "../controllers/adminWinnerController";
import { authenticate, requireRole } from "../middlewares/auth";
import { adminWinnerReadRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/", adminWinnerReadRateLimiter, adminWinnerController.list);

export { router as adminWinnerRouter };
