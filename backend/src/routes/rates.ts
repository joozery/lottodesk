import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http.js";
import { Dealer, RateOverride } from "../models.js";
import { BET_TYPE_KEYS, loadRateConfig } from "../services/rates.js";

const rateValue = z.number().positive("อัตราต้องมากกว่า 0").max(1_000_000);
const body = z.object(Object.fromEntries(BET_TYPE_KEYS.map((t) => [t, rateValue.optional()])) as Record<string, z.ZodOptional<typeof rateValue>>).strict();
const commissionBody = z.object({ percent: z.number().min(0, "ต้องไม่ติดลบ").max(100, "ต้องไม่เกิน 100") });

export function ratesRouter() {
  const r = Router();

  r.get("/", async (_req, res) => {
    res.json(await loadRateConfig());
  });

  /** ตั้งอัตราจ่ายกลางที่ใช้กับทุกคน — ส่ง {} เพื่อกลับไปใช้ค่าเริ่มต้น */
  r.put("/", async (req, res) => {
    const rates = parse(body, req.body);
    if (Object.keys(rates).length === 0) await RateOverride.deleteOne({ scope: "global", refId: "default" });
    else await RateOverride.findOneAndUpdate({ scope: "global", refId: "default" }, { rates }, { upsert: true });
    res.json(await loadRateConfig());
  });

  r.put("/commission/:dealerId", async (req, res) => {
    const { percent } = parse(commissionBody, req.body);
    const dealer = await Dealer.findByIdAndUpdate(req.params.dealerId, { commission: percent });
    if (!dealer) throw new HttpError(404, "ไม่พบเจ้ามือ");
    res.json(await loadRateConfig());
  });

  return r;
}
