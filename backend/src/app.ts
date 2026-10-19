import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import type { Config } from "./config";
import { requireAdmin, requireAuth, requireWrite } from "./middleware/auth";
import { HttpError, errorHandler } from "./middleware/http";
import { authRouter } from "./routes/auth";
import { billsRouter } from "./routes/bills";
import { dealersRouter } from "./routes/dealers";
import { ledgerRouter } from "./routes/ledger";
import { paymentsRouter } from "./routes/payments";
import { periodsRouter } from "./routes/periods";
import { prizeResultsRouter } from "./routes/prize-results";
import { ratesRouter } from "./routes/rates";
import { usersRouter } from "./routes/users";

export function createApp(config: Config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN.split(",").map((s) => s.trim()), credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const api = express.Router();
  api.get("/health", (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
  });
  api.use("/auth", authRouter(config));

  api.use(requireAuth(config.JWT_SECRET));
  api.use("/dealers", requireWrite("dealers", "entry"), dealersRouter());
  api.use("/periods", periodsRouter());
  api.use("/ledger", ledgerRouter());
  api.use("/bills", requireWrite("entry"), billsRouter());
  api.use("/payments", requireWrite("payments"), paymentsRouter());
  api.use("/prize-results", requireWrite("results"), prizeResultsRouter());
  api.use("/rates", requireWrite("settings"), ratesRouter());
  api.use("/users", requireAdmin, usersRouter());
  api.use(() => { throw new HttpError(404, "ไม่พบ endpoint นี้"); });

  app.use("/api", api);
  app.use(errorHandler);
  return app;
}
