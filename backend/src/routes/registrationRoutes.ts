import { Router } from "express";

import { registrationController } from "../controllers/registrationController";
import { authenticate, requireRole } from "../middlewares/auth";
import { registrationRateLimiter } from "../middlewares/rateLimit";

const router = Router();

// requireRole (which needs authenticate to have already run) must come
// before the rate limiter here — it keys on req.user.id.
router.use(authenticate, requireRole("EMPLOYEE"), registrationRateLimiter);
router.post("/", registrationController.create);
router.get("/me", registrationController.mine);

export { router as registrationRouter };
