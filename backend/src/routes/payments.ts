import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http";
import { Dealer, Payment } from "../models";
import { pubPayment } from "../serialize";
import { applyReceipt, outstandingByCustomer } from "../services/payments";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const listQuery = z.object({ lottery: z.enum(["all", "thai", "lao"]).default("all"), from: day, to: day });
const createBody = z.object({
  collectorId: z.string().min(1),
  lottery: z.enum(["thai", "lao"]),
  direction: z.enum(["in", "out"]),
  amount: z.number().positive("จำนวนเงินต้องมากกว่า 0").max(100_000_000),
  note: z.string().trim().max(300).default(""),
  /** ลูกค้าที่รับเงินจาก (direction = in) — หักยอดค้างชำระ */
  customerId: z.string().min(1).nullable().default(null),
});

/** วัน (เวลาไทย) → ช่วงเวลา UTC ครึ่งเปิด [start, end) */
const bangkokStart = (d: string) => new Date(`${d}T00:00:00+07:00`);
const bangkokNextDay = (d: string) => new Date(bangkokStart(d).getTime() + 24 * 3600 * 1000);

export function paymentsRouter() {
  const r = Router();

  /** รายการรับ–จ่ายในช่วงวันที่ (ตามวันที่ทำรายการ เวลาไทย) เรียงใหม่ → เก่า */
  r.get("/", async (req, res) => {
    const q = parse(listQuery, req.query);
    const rows = await Payment.find({
      at: { $gte: bangkokStart(q.from), $lt: bangkokNextDay(q.to) },
      ...(q.lottery === "all" ? {} : { lottery: q.lottery }),
    }).sort({ at: -1 }).lean();
    res.json(rows.map(pubPayment));
  });

  r.get("/outstanding", async (_req, res) => {
    res.json(await outstandingByCustomer());
  });

  r.post("/", async (req, res) => {
    const body = parse(createBody, req.body);
    const dealer = await Dealer.findOne({ "collectors._id": body.collectorId }).lean();
    const collector = dealer?.collectors.find((c) => c._id === body.collectorId);
    if (!collector) throw new HttpError(400, "ไม่พบผู้ส่งโพย");
    if (body.customerId && !collector.customers.some((c) => c._id === body.customerId)) throw new HttpError(400, "ไม่พบลูกค้าในผู้ส่งโพยนี้");

    if (body.direction === "in" && body.customerId) await applyReceipt(body.customerId, body.amount);
    const payment = await Payment.create({ ...body, periodId: "", recorded: true });
    res.status(201).json(pubPayment(payment.toObject()));
  });

  return r;
}
