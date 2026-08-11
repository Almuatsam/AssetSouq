import { Router } from "express";

import { adminDeviceRouter } from "./adminDeviceRoutes";
import { adminEmployeeRouter } from "./adminEmployeeRoutes";
import { adminRegistrationRouter } from "./adminRegistrationRoutes";
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
router.use("/admin/devices", adminDeviceRouter);
router.use("/admin/employees", adminEmployeeRouter);
router.use("/admin/registrations", adminRegistrationRouter);

// Remaining feature routers are mounted here as they're implemented, e.g.:
// router.use("/draws", drawRouter);
// router.use("/winners", winnerRouter);
// router.use("/reports", reportRouter);

export { router };
