import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http";
import { Activity, Bill, Dealer, Period, nextSeq } from "../models";
import { pubBill } from "../serialize";
import { BET_LABEL } from "../shared/prize-calc";

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
});

export function billsRouter() {
  const r = Router();

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
    const collector = dealer?.collectors.find((c) => c._id === body.collectorId);
    if (!collector) throw new HttpError(400, "ไม่พบผู้ส่งโพย");
    const customer = body.customerId ? collector.customers.find((c) => c._id === body.customerId) : null;
    if (body.customerId && !customer) throw new HttpError(400, "ไม่พบลูกค้าในผู้ส่งโพยนี้");

    const amount = body.lines.reduce((s, l) => s + l.amount, 0);
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
      lines: body.lines,
      // โพยตัวเองของผู้ส่งโพยไม่มียอดค้าง
      outstanding: body.paid || !customer ? 0 : amount,
    });
    await Activity.create({
      actor: req.user?.name ?? "-",
      text: `คีย์โพย${customer?.name ?? collector.name} จำนวน ${amount.toLocaleString("th-TH")} บาท`,
      collectorId: body.collectorId,
      lottery: period.lottery,
    });
    res.status(201).json(pubBill(bill.toObject()));
  });

  return r;
}
