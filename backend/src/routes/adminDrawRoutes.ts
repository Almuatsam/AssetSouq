import { Router } from "express";

import { adminDrawController } from "../controllers/adminDrawController";
import { authenticate, requireRole } from "../middlewares/auth";
import { adminDrawWriteRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.post("/", adminDrawWriteRateLimiter, adminDrawController.run);

export { router as adminDrawRouter };
