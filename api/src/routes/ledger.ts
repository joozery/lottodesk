import { Router } from "express";
import { z } from "zod";
import { parse } from "../middleware/http.js";
import { buildLedger } from "../services/ledger.js";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.object({
  lottery: z.enum(["all", "thai", "lao"]).default("all"),
  periodId: z.string().min(1).optional(),
  from: day.default("0000-01-01"),
  to: day.default("9999-12-31"),
});

export function ledgerRouter() {
  const r = Router();
  r.get("/", async (req, res) => {
    const q = parse(query, req.query);
    res.json(await buildLedger({ lottery: q.lottery, periodId: q.periodId ?? null, from: q.from, to: q.to }));
  });
  return r;
}
