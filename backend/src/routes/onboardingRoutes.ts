import { Router } from "express";

import { onboardingController } from "../controllers/onboardingController";
import { authenticate } from "../middlewares/auth";

const router = Router();

// Both Employees and Admins have onboarding progress, so this only runs
// authenticate — no requireRole (contrast with registrationRoutes.ts,
// which is EMPLOYEE-only).
router.use(authenticate);
router.get("/me", onboardingController.me);
router.patch("/me", onboardingController.updateMe);

export { router as onboardingRouter };
