import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import type { Config } from "./config.js";
import { requireAdmin, requireAuth, requireWrite } from "./middleware/auth.js";
import { HttpError, errorHandler } from "./middleware/http.js";
import { authRouter } from "./routes/auth.js";
import { billsRouter } from "./routes/bills.js";
import { dealersRouter } from "./routes/dealers.js";
import { ledgerRouter } from "./routes/ledger.js";
import { paymentsRouter } from "./routes/payments.js";
import { periodsRouter } from "./routes/periods.js";
import { prizeResultsRouter } from "./routes/prize-results.js";
import { ratesRouter } from "./routes/rates.js";
import { usersRouter } from "./routes/users.js";

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
