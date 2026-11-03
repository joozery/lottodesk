import { Bill } from "../models";
import { HttpError } from "../middleware/http";

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
  await applyReceiptToBills({ customerId }, amount);
}

/** รับเงินในระดับผู้รวบรวม/ลูกค้าหลัก แล้วตัดบิลค้างตามลำดับเก่าไปใหม่ */
export async function applyReceiptByCollector(collectorId: string, amount: number): Promise<void> {
  await applyReceiptToBills({ collectorId }, amount);
}

export async function applyReceiptByBill(billId: string, amount: number, collectorId: string): Promise<void> {
  const bill = await Bill.findOne({ _id: billId, collectorId }).select("outstanding").lean();
  if (!bill) throw new HttpError(404, "ไม่พบบิลที่ต้องการรับเงิน");
  if (amount > bill.outstanding) throw new HttpError(400, "จำนวนเงินเกินยอดค้างของบิล");
  const remaining = Math.max(0, Math.round((bill.outstanding - amount) * 100) / 100);
  await Bill.updateOne({ _id: billId }, { $set: { outstanding: remaining } });
}

async function applyReceiptToBills(filter: { customerId?: string; collectorId?: string }, amount: number): Promise<void> {
  const owed = await Bill.find({ ...filter, outstanding: { $gt: 0 } }).sort({ createdAt: 1 }).select("outstanding").lean();
  const total = owed.reduce((s, b) => s + b.outstanding, 0);
  if (amount > total) throw new HttpError(400, `จำนวนเงินเกินยอดค้างชำระ (ค้าง ${total})`);

  let left = amount;
  const ops = [];
  for (const b of owed) {
    if (left <= 0) break;
    const take = Math.min(b.outstanding, left);
    left -= take;
    const remaining = Math.max(0, Math.round((b.outstanding - take) * 100) / 100);
    ops.push({ updateOne: { filter: { _id: b._id }, update: { $set: { outstanding: remaining } } } });
  }
  if (ops.length) await Bill.bulkWrite(ops);
}
