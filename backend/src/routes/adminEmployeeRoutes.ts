import { Router } from "express";

import { adminEmployeeController } from "../controllers/adminEmployeeController";
import { authenticate, requireRole } from "../middlewares/auth";
import { adminEmployeeReadRateLimiter, adminEmployeeWriteRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/", adminEmployeeReadRateLimiter, adminEmployeeController.list);
router.get("/:id", adminEmployeeReadRateLimiter, adminEmployeeController.getById);
router.post("/", adminEmployeeWriteRateLimiter, adminEmployeeController.create);
router.patch("/:id", adminEmployeeWriteRateLimiter, adminEmployeeController.update);

export { router as adminEmployeeRouter };
