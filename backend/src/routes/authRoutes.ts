import { Router } from "express";

import { authController } from "../controllers/authController";
import { authenticate } from "../middlewares/auth";
import { adminLoginRateLimiter, employeeLoginRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.post("/employee/login", employeeLoginRateLimiter, authController.employeeLogin);
router.post("/admin/login", adminLoginRateLimiter, authController.adminLogin);
router.get("/me", authenticate, authController.me);

export { router as authRouter };
