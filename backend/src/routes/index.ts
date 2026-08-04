import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

// Feature routers are mounted here as they're implemented, e.g.:
// router.use("/auth", authRouter);
// router.use("/employees", employeeRouter);
// router.use("/devices", deviceRouter);
// router.use("/registrations", registrationRouter);
// router.use("/draws", drawRouter);
// router.use("/winners", winnerRouter);
// router.use("/reports", reportRouter);

export { router };
