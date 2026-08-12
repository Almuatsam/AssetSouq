import { Router } from "express";

import { adminAuditLogController } from "../controllers/adminAuditLogController";
import { authenticate, requireRole } from "../middlewares/auth";
import { adminAuditLogReadRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/", adminAuditLogReadRateLimiter, adminAuditLogController.list);

export { router as adminAuditLogRouter };
