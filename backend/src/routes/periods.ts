import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http";
import { Period, PrizeResultModel } from "../models";
import { pubPeriod } from "../serialize";
import { loadRateConfig, resolveRates } from "../services/rates";

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

  r.patch("/:id/limited-numbers", async (req, res) => {
    const { numbers, closedNumbers, limits, rates, limitedRates: limitedRateConfig } = parse(z.object({
      numbers: z.array(z.string().regex(/^\d{1,3}$/)).max(200),
      closedNumbers: z.array(z.string().regex(/^\d{1,3}$/)).max(200).default([]),
      limits: z.record(z.string().regex(/^\d{1,3}$/), z.number().positive().max(100_000_000)).default({}),
      rates: z.record(z.string(), z.number().positive().max(100_000_000)).optional(),
      limitedRates: z.record(z.string().regex(/^\d{1,3}$/), z.record(z.string(), z.number().positive().max(100_000_000))).optional(),
      limitedRate: z.record(z.string(), z.number().positive().max(100_000_000)).optional(),
    }), req.body);
    const uniqueNumbers = [...new Set(numbers)];
    const uniqueClosedNumbers = [...new Set(closedNumbers)];
    const normalRates = resolveRates(await loadRateConfig(), rates ?? {});
    const limitedRate = uniqueNumbers.length > 0 ? Object.fromEntries(Object.entries(normalRates).map(([type, value]) => [type, value / 2])) : {};
    const limitedAmounts = Object.fromEntries(uniqueNumbers.filter((number) => limits[number] !== undefined).map((number) => [number, limits[number]]));
    const limitedRates = Object.fromEntries(uniqueNumbers.filter((number) => limitedRateConfig?.[number] !== undefined).map((number) => [number, limitedRateConfig?.[number]]));
    const period = await Period.findByIdAndUpdate(req.params.id, { $set: { limitedNumbers: uniqueNumbers, closedNumbers: uniqueClosedNumbers, limitedAmounts, rates: rates ?? {}, limitedRates, limitedRate: limitedRate ?? {} } }, { returnDocument: "after" }).lean();
    if (!period) throw new HttpError(404, "ไม่พบงวด");
    res.json(pubPeriod(period));
  });

  return r;
}
