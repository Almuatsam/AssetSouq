import { Router } from "express";

import { authRouter } from "./authRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

router.use("/auth", authRouter);

// Remaining feature routers are mounted here as they're implemented, e.g.:
// router.use("/employees", employeeRouter);
// router.use("/devices", deviceRouter);
// router.use("/registrations", registrationRouter);
// router.use("/draws", drawRouter);
// router.use("/winners", winnerRouter);
// router.use("/reports", reportRouter);

export { router };
