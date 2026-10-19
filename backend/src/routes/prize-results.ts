import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http";
import { Period, PrizeResultModel } from "../models";
import { pubPrize } from "../serialize";
import { PRIZE_SPEC } from "../shared/prize";

const body = z.object({ groups: z.array(z.object({ key: z.string(), numbers: z.array(z.string().regex(/^\d+$/)) })) });

export function prizeResultsRouter() {
  const r = Router();

  /** 404 = งวดนี้ยังไม่มีผลรางวัล */
  r.get("/:periodId", async (req, res) => {
    const doc = await PrizeResultModel.findOne({ periodId: req.params.periodId }).lean();
    if (!doc) throw new HttpError(404, "งวดนี้ยังไม่มีผลรางวัล");
    res.json(pubPrize(doc));
  });

  /** บันทึก/แก้ผลรางวัลของงวด — ตรวจจำนวนและจำนวนหลักตามประเภทหวย */
  r.put("/:periodId", async (req, res) => {
    const { groups } = parse(body, req.body);
    const period = await Period.findById(req.params.periodId).lean();
    if (!period) throw new HttpError(404, "ไม่พบงวด");

    const spec = PRIZE_SPEC[period.lottery as "thai" | "lao"];
    const normalized = spec.map((s) => {
      const numbers = groups.find((g) => g.key === s.key)?.numbers ?? [];
      if (numbers.length !== s.count || numbers.some((n) => n.length !== s.digits)) {
        throw new HttpError(400, `${s.label} ต้องมี ${s.count} ตัว ตัวละ ${s.digits} หลัก`);
      }
      return { key: s.key, label: s.label, numbers };
    });

    const doc = await PrizeResultModel.findOneAndUpdate(
      { periodId: period._id },
      { periodId: period._id, announcedAt: new Date(), confirmedBy: req.user?.name ?? "-", groups: normalized },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).lean();
    res.json(pubPrize(doc));
  });

  return r;
}
