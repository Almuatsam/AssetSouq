import { Router } from "express";

import { adminReportController } from "../controllers/adminReportController";
import { authenticate, requireRole } from "../middlewares/auth";
import { adminReportReadRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"), adminReportReadRateLimiter);
router.get("/devices", adminReportController.devices);
router.get("/employees", adminReportController.employees);
router.get("/registrations", adminReportController.registrations);
router.get("/winners", adminReportController.winners);

export { router as adminReportRouter };
