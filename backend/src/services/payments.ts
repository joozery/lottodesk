import { Bill } from "../models.js";
import { HttpError } from "../middleware/http.js";

/** ยอดค้างชำระของลูกค้าแต่ละราย รวมทุกงวด */
export async function outstandingByCustomer(): Promise<Record<string, number>> {
  const rows = await Bill.aggregate<{ _id: string; total: number }>([
    { $match: { customerId: { $ne: null }, outstanding: { $gt: 0 } } },
    { $group: { _id: "$customerId", total: { $sum: "$outstanding" } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.total]));
}

/** ตัดยอดค้างของลูกค้า โดยตัดบิลเก่าสุดก่อน (FIFO) — ตัดเกินยอดค้างไม่ได้ */
export async function applyReceipt(customerId: string, amount: number): Promise<void> {
  const owed = await Bill.find({ customerId, outstanding: { $gt: 0 } }).sort({ createdAt: 1 }).select("outstanding").lean();
  const total = owed.reduce((s, b) => s + b.outstanding, 0);
  if (amount > total) throw new HttpError(400, `จำนวนเงินเกินยอดค้างชำระ (ค้าง ${total})`);

  let left = amount;
  const ops = [];
  for (const b of owed) {
    if (left <= 0) break;
    const take = Math.min(b.outstanding, left);
    left -= take;
    ops.push({ updateOne: { filter: { _id: b._id }, update: { $inc: { outstanding: -take } } } });
  }
  if (ops.length) await Bill.bulkWrite(ops);
}
