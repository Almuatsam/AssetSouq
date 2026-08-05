import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { router } from "./routes";

export function createApp() {
  const app = express();

  // Must be set correctly (see config/env.ts) whenever this runs behind a
  // reverse proxy/load balancer — the login rate limiter keys on req.ip,
  // which is meaningless without this.
  app.set("trust proxy", env.trustProxy);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
