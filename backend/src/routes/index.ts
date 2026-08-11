import { Router } from "express";

import { adminDashboardRouter } from "./adminDashboardRoutes";
import { adminDeviceRouter } from "./adminDeviceRoutes";
import { adminDrawRouter } from "./adminDrawRoutes";
import { adminEmployeeRouter } from "./adminEmployeeRoutes";
import { adminRegistrationRouter } from "./adminRegistrationRoutes";
import { adminWinnerRouter } from "./adminWinnerRoutes";
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
router.use("/admin/dashboard", adminDashboardRouter);
router.use("/admin/draws", adminDrawRouter);
router.use("/admin/winners", adminWinnerRouter);

// Remaining feature routers are mounted here as they're implemented, e.g.:
// router.use("/reports", reportRouter);

export { router };
