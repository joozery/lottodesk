import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http";
import { Activity, Bill, Dealer, Payment, Period, nextSeq } from "../models";
import { pubBill } from "../serialize";
import { BET_LABEL } from "../shared/prize-calc";
import { computeExposure, normNumber } from "../services/risk";
import { loadRateConfig, resolveRates } from "../services/rates";

const DIGITS = { top3: 3, tod3: 3, bottom3: 3, top2: 2, bottom2: 2, runTop: 1, runBottom: 1 } as const;
const line = z.object({
  type: z.enum(["top3", "tod3", "bottom3", "top2", "bottom2", "runTop", "runBottom"]),
  number: z.string().regex(/^\d+$/, "เลขต้องเป็นตัวเลขเท่านั้น"),
  amount: z.number().positive("ยอดต้องมากกว่า 0").max(10_000_000),
}).superRefine((l, ctx) => {
  if (l.number.length !== DIGITS[l.type]) ctx.addIssue({ code: "custom", message: `${BET_LABEL[l.type]} ต้องมี ${DIGITS[l.type]} หลัก`, path: ["number"] });
});

const createBody = z.object({
  collectorId: z.string().min(1),
  /** null = โพยตัวเองของผู้ส่งโพย */
  customerId: z.string().min(1).nullable().default(null),
  periodId: z.string().min(1),
  lines: z.array(line).min(1, "ต้องมีอย่างน้อย 1 รายการ").max(500),
  /** true = รับเงินครบแล้วตอนคีย์ (ไม่มียอดค้าง) */
  paid: z.boolean().default(false),
  discountPercent: z.number().min(0).max(100).default(0),
  specialDiscountPercent: z.number().min(0).max(100).optional(),
  paidAmount: z.number().min(0).max(100_000_000).default(0),
});

export function billsRouter() {
  const r = Router();

  r.patch("/:id/discount", async (req, res) => {
    const body = parse(z.object({ numberDiscountPercent: z.number().min(0).max(100), runDiscountPercent: z.number().min(0).max(100) }), req.body);
    const bill = await Bill.findById(req.params.id);
    if (!bill) throw new HttpError(404, "ไม่พบบิล");
    const grossAmount = bill.grossAmount ?? bill.lines.reduce((sum, item) => sum + item.amount, 0);
    const numberGross = bill.lines.filter((item) => item.type !== "runTop" && item.type !== "runBottom").reduce((sum, item) => sum + item.amount, 0);
    const runGross = grossAmount - numberGross;
    const discountAmount = Math.round((numberGross * body.numberDiscountPercent + runGross * body.runDiscountPercent)) / 100;
    const amount = Math.round((grossAmount - discountAmount) * 100) / 100;
    const paidAmount = Math.max(0, bill.amount - bill.outstanding);
    bill.grossAmount = grossAmount;
    bill.discountPercent = grossAmount > 0 ? Math.round((discountAmount / grossAmount) * 10000) / 100 : 0;
    bill.specialDiscountPercent = body.numberDiscountPercent;
    bill.specialNumberDiscountPercent = body.numberDiscountPercent;
    bill.specialRunDiscountPercent = body.runDiscountPercent;
    bill.discountAmount = discountAmount;
    bill.amount = amount;
    bill.outstanding = Math.max(0, Math.round((amount - paidAmount) * 100) / 100);
    await bill.save();
    res.json(pubBill(bill.toObject()));
  });

  r.get("/:id", async (req, res) => {
    const bill = await Bill.findById(req.params.id).lean();
    if (!bill) throw new HttpError(404, "ไม่พบบิล");
    res.json(pubBill(bill));
  });

  r.post("/", async (req, res) => {
    const body = parse(createBody, req.body);
    const [period, dealer] = await Promise.all([
      Period.findById(body.periodId).lean(),
      Dealer.findOne({ "collectors._id": body.collectorId }).lean(),
    ]);
    if (!period) throw new HttpError(400, "ไม่พบงวด");
    const closedLine = body.lines.find((line) => (period.closedNumbers ?? []).includes(line.number));
    if (closedLine) throw new HttpError(400, `เลข ${closedLine.number} ปิดรับในงวดนี้ ไม่สามารถซื้อได้`);
    const collector = dealer?.collectors.find((c) => c._id === body.collectorId);
    if (!collector) throw new HttpError(400, "ไม่พบผู้ส่งโพย");
    const customer = body.customerId ? collector.customers.find((c) => c._id === body.customerId) : null;
    if (body.customerId && !customer) throw new HttpError(400, "ไม่พบลูกค้าในผู้ส่งโพยนี้");

    const grossAmount = body.lines.reduce((s, l) => s + l.amount, 0);
    const rates = resolveRates(await loadRateConfig(), period.rates ?? {});
    const discountAmount = Math.round(grossAmount * body.discountPercent) / 100;
    const amount = Math.round((grossAmount - discountAmount) * 100) / 100;
    const paidAmount = body.paid ? amount : body.paidAmount;
    if (paidAmount > amount) throw new HttpError(400, "ยอดที่จ่ายเกินยอดสุทธิของบิล");
    const seq = await nextSeq("bill");
    // เลขบิลใช้ปี พ.ศ. ตามข้อมูลตั้งต้น (B-2569-0001)
    const year = Number(period.drawDate.slice(0, 4)) + 543;
    const bill = await Bill.create({
      no: `B-${year}-${String(seq).padStart(4, "0")}`,
      collectorId: body.collectorId,
      customerId: body.customerId,
      lottery: period.lottery,
      periodId: body.periodId,
      amount,
      grossAmount,
      discountPercent: body.discountPercent,
      specialDiscountPercent: body.specialDiscountPercent,
      discountAmount,
      lines: body.lines,
      outstanding: Math.round((amount - paidAmount) * 100) / 100,
      rates,
      rateOverrides: Object.fromEntries((period.limitedNumbers ?? []).map((number) => [number, period.limitedRate ?? period.limitedRates?.[number] ?? {}])),
    });
    try {
      if (paidAmount > 0) await Payment.create({ collectorId: body.collectorId, customerId: body.customerId, lottery: period.lottery, periodId: period._id, direction: "in", amount: paidAmount, note: `รับเงินตอนคีย์บิล ${bill.no}`, recorded: true });
    } catch (error) {
      await Bill.deleteOne({ _id: bill._id });
      throw error;
    }
    try {
      await Activity.create({
        actor: req.user?.name ?? "-",
        text: `คีย์โพย${customer?.name ?? collector.name} จำนวน ${amount.toLocaleString("th-TH")} บาท`,
        collectorId: body.collectorId,
        lottery: period.lottery,
      });
    } catch (error) {
      console.error("บันทึกกิจกรรมของบิลไม่สำเร็จ", bill.no, error);
    }
    // เตือนเลขที่เกินวงเงิน (ยังรับบิลตามปกติ)
    let warnings: unknown[] = [];
    try {
      const exposure = await computeExposure(body.periodId);
      const mine = new Set(body.lines.map((l) => `${l.type}:${normNumber(l.type, l.number)}`));
      warnings = exposure.rows.filter((x) => x.excess > 0 && x.limit !== null && mine.has(`${x.type}:${x.number}`)).map((x) => ({ type: x.type, number: x.number, total: x.total, limit: x.limit, excess: x.excess }));
    } catch (error) {
      console.error("คำนวณยอดเกินวงเงินไม่สำเร็จ", bill.no, error);
    }
    res.status(201).json({ ...pubBill(bill.toObject()), warnings });
  });

  return r;
}
