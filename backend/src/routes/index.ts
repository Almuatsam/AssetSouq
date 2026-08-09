import { Router } from "express";

import { authRouter } from "./authRoutes";
import { deviceRouter } from "./deviceRoutes";
import { registrationRouter } from "./registrationRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

router.use("/auth", authRouter);
router.use("/devices", deviceRouter);
router.use("/registrations", registrationRouter);

// Remaining feature routers are mounted here as they're implemented, e.g.:
// router.use("/employees", employeeRouter);
// router.use("/draws", drawRouter);
// router.use("/winners", winnerRouter);
// router.use("/reports", reportRouter);

export { router };
