import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http.js";
import { Dealer, RateOverride } from "../models.js";
import { BET_TYPE_KEYS, loadRateConfig } from "../services/rates.js";

const rateValue = z.number().positive("อัตราต้องมากกว่า 0").max(1_000_000);
const body = z.object(Object.fromEntries(BET_TYPE_KEYS.map((t) => [t, rateValue.optional()])) as Record<string, z.ZodOptional<typeof rateValue>>).strict();

export function ratesRouter() {
  const r = Router();

  r.get("/", async (_req, res) => {
    res.json(await loadRateConfig());
  });

  /** ตั้งอัตราทับของเจ้ามือหรือลูกค้า — ส่ง {} เพื่อล้างกลับไปใช้ค่าสืบทอด */
  r.put("/:scope/:id", async (req, res) => {
    const scope = parse(z.enum(["dealer", "customer"]), req.params.scope);
    const id = String(req.params.id);
    const rates = parse(body, req.body);

    const exists = scope === "dealer" ? await Dealer.exists({ _id: id }) : await Dealer.exists({ "collectors.customers._id": id });
    if (!exists) throw new HttpError(404, scope === "dealer" ? "ไม่พบเจ้ามือ" : "ไม่พบลูกค้า");

    if (Object.keys(rates).length === 0) await RateOverride.deleteOne({ scope, refId: id });
    else await RateOverride.findOneAndUpdate({ scope, refId: id }, { rates }, { upsert: true });
    res.json(await loadRateConfig());
  });

  return r;
}
