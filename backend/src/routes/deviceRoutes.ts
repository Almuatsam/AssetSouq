import { Router } from "express";

import { deviceController } from "../controllers/deviceController";
import { authenticate, requireRole } from "../middlewares/auth";
import { deviceRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("EMPLOYEE", "ADMIN"), deviceRateLimiter);
router.get("/", deviceController.list);
router.get("/:id", deviceController.getById);

export { router as deviceRouter };
