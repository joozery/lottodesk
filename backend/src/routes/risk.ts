import { Router } from "express";
import { z } from "zod";
import { requireWrite } from "../middleware/auth";
import { HttpError, parse } from "../middleware/http";
import { AppSetting, Dealer, LayOff, Period, nextSeq } from "../models";
import { loadDiscount } from "../services/risk";
import { BET_TYPES, computeExposure, loadLimits, normNumber, pubLayoff } from "../services/risk";

const DIGITS = { top3: 3, tod3: 3, bottom3: 3, top2: 2, bottom2: 2, runTop: 1, runBottom: 1 } as const;
const limitsBody = z.object(Object.fromEntries(BET_TYPES.map((t) => [t, z.number().positive("วงเงินต้องมากกว่า 0").max(100_000_000).optional()]))).strict();
const layoffBody = z.object({
  periodId: z.string().min(1),
  target: z.string().trim().max(100).default(""),
  note: z.string().trim().max(300).default(""),
  lines: z.array(z.object({
    type: z.enum(["top3", "tod3", "bottom3", "top2", "bottom2", "runTop", "runBottom"]),
    number: z.string().regex(/^\d+$/),
    amount: z.number().positive("ยอดตีออกต้องมากกว่า 0").max(100_000_000),
  })).min(1, "ต้องเลือกอย่างน้อย 1 เลข").max(1000),
});

const discountBody = z.object({
  threshold: z.number().positive("ยอดเกณฑ์ต้องมากกว่า 0").max(1_000_000_000),
  below: z.number().min(0).max(100),
  atOrAbove: z.number().min(0).max(100),
});

export function riskRouter() {
  const r = Router();

  r.get("/limits", async (_req, res) => { res.json(await loadLimits()); });

  r.put("/limits", requireWrite("settings"), async (req, res) => {
    const limits = parse(limitsBody, req.body);
    // บันทึก {} ไว้ด้วย = ไม่จำกัด (ต่างจากยังไม่เคยตั้ง ซึ่งใช้ค่าเริ่มต้น)
    await AppSetting.findByIdAndUpdate("limits", { value: limits }, { upsert: true });
    res.json(await loadLimits());
  });

  r.get("/discount", async (_req, res) => { res.json(await loadDiscount()); });

  r.put("/discount", requireWrite("settings"), async (req, res) => {
    await AppSetting.findByIdAndUpdate("discount", { value: parse(discountBody, req.body) }, { upsert: true });
    res.json(await loadDiscount());
  });

  r.get("/exposure/:periodId", async (req, res) => {
    res.json(await computeExposure(req.params.periodId));
  });

  r.post("/layoffs", async (req, res) => {
    const body = parse(layoffBody, req.body);
    const period = await Period.findById(body.periodId).lean();
    if (!period) throw new HttpError(400, "ไม่พบงวด");
    // รวมเลขซ้ำในแผ่นเดียวกัน และตรวจว่าไม่เกินยอดที่ซื้อจริง
    const merged = new Map<string, { type: (typeof body.lines)[number]["type"]; number: string; amount: number }>();
    for (const l of body.lines) {
      if (l.number.length !== DIGITS[l.type]) throw new HttpError(400, `เลข ${l.number} ไม่ตรงกับประเภทที่เลือก`);
      const number = normNumber(l.type, l.number);
      const k = `${l.type}:${number}`;
      const cur = merged.get(k);
      if (cur) cur.amount += l.amount; else merged.set(k, { type: l.type, number, amount: l.amount });
    }
    const exposure = await computeExposure(body.periodId);
    const byKey = new Map(exposure.rows.map((x) => [`${x.type}:${x.number}`, x]));
    for (const [k, l] of merged) {
      const row = byKey.get(k);
      if (!row || l.amount > row.retained + 1e-9) throw new HttpError(400, `ตีออกเลข ${l.number} เกินยอดที่ซื้อ (คงเหลือ ${row?.retained ?? 0} บาท)`);
    }
    const lines = [...merged.values()];
    const seq = await nextSeq("layoff");
    const year = Number(period.drawDate.slice(0, 4)) + 543;
    const sheet = await LayOff.create({
      no: `L-${year}-${String(seq).padStart(4, "0")}`,
      periodId: body.periodId, lottery: period.lottery, target: body.target, note: body.note,
      lines, total: Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100, actor: req.user?.name ?? "-",
    });
    res.status(201).json(pubLayoff(sheet.toObject()));
  });

  r.delete("/layoffs/:id", async (req, res) => {
    const gone = await LayOff.findByIdAndDelete(req.params.id);
    if (!gone) throw new HttpError(404, "ไม่พบแผ่นตีออก");
    res.status(204).end();
  });

  /** รายชื่อผู้รับตีออกที่เคยใช้ + เจ้ามือในระบบ (ใช้เป็นคำแนะนำตอนพิมพ์) */
  r.get("/targets", async (_req, res) => {
    const [used, dealers] = await Promise.all([LayOff.distinct("target"), Dealer.find({}, { name: 1 }).lean()]);
    res.json([...new Set([...used, ...dealers.map((d) => d.name)].filter(Boolean))]);
  });

  return r;
}
