import { Router } from "express";

import { adminWinnerController } from "../controllers/adminWinnerController";
import { authenticate, requireRole } from "../middlewares/auth";
import {
  adminDrawWriteRateLimiter,
  adminWinnerReadRateLimiter,
  adminWinnerWriteRateLimiter,
} from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/", adminWinnerReadRateLimiter, adminWinnerController.list);
router.patch("/:id/payment", adminWinnerWriteRateLimiter, adminWinnerController.recordPayment);
router.patch("/:id/handover", adminWinnerWriteRateLimiter, adminWinnerController.recordHandover);
// Reuses the draw write limiter (not the routine winner write limiter) —
// a redraw is exactly as consequential as an original draw (creates a
// new financial obligation + winner), so it gets the same tight budget.
router.post("/:id/redraw", adminDrawWriteRateLimiter, adminWinnerController.redraw);

export { router as adminWinnerRouter };
