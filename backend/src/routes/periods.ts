import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http";
import { Period, PrizeResultModel } from "../models";
import { pubPeriod } from "../serialize";

const createBody = z.object({ lottery: z.enum(["thai", "lao"]), drawDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ต้องเป็น YYYY-MM-DD") });

export function periodsRouter() {
  const r = Router();

  /** งวดที่มีผลรางวัลแล้ว = ยืนยันผลแล้ว */
  r.get("/", async (_req, res) => {
    const [periods, results] = await Promise.all([Period.find().sort({ drawDate: -1 }).lean(), PrizeResultModel.find().select("periodId").lean()]);
    const confirmed = new Set(results.map((x) => x.periodId));
    res.json(periods.map((p) => ({ ...pubPeriod(p), status: confirmed.has(p._id) ? "confirmed" : "pending" })));
  });

  r.post("/", async (req, res) => {
    const { lottery, drawDate } = parse(createBody, req.body);
    const id = `${lottery === "thai" ? "th" : "lao"}-${drawDate.slice(5, 7)}${drawDate.slice(8, 10)}`;
    if (await Period.exists({ _id: id })) throw new HttpError(409, "มีงวดนี้อยู่แล้ว");
    res.status(201).json({ ...pubPeriod((await Period.create({ _id: id, lottery, drawDate })).toObject()), status: "pending" });
  });

  return r;
}
