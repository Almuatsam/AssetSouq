import { Router } from "express";

import { adminDeviceController } from "../controllers/adminDeviceController";
import { authenticate, requireRole } from "../middlewares/auth";
import { adminDeviceReadRateLimiter, adminDeviceWriteRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/", adminDeviceReadRateLimiter, adminDeviceController.list);
router.post("/", adminDeviceWriteRateLimiter, adminDeviceController.create);
router.patch("/:id", adminDeviceWriteRateLimiter, adminDeviceController.update);

export { router as adminDeviceRouter };
