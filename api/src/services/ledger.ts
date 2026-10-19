import { billPrize } from "../shared/prize-calc.js";
import type { Activity, Ledger, LotteryFilter, Payment } from "../shared/types.js";
import { Activity as ActivityModel, Bill, Dealer, Payment as PaymentModel, Period, PrizeResultModel } from "../models.js";
import { pubActivity, pubBill, pubPayment, pubPrize } from "../serialize.js";
import { loadRateConfig, resolveRates } from "./rates.js";

export interface LedgerQuery {
  lottery: LotteryFilter;
  periodId: string | null;
  /** YYYY-MM-DD ใช้เมื่อ periodId เป็น null */
  from: string;
  to: string;
}

/** บิล รับ–จ่าย และกิจกรรมในขอบเขตที่เลือก พร้อมเงินรางวัลที่คำนวณจากผลรางวัลและอัตราจ่ายของเจ้ามือ/ลูกค้า */
export async function buildLedger(q: LedgerQuery): Promise<Ledger> {
  const inScope = (lottery: string) => q.lottery === "all" || lottery === q.lottery;

  const periods = await Period.find(
    q.periodId
      ? { _id: q.periodId, ...(q.lottery === "all" ? {} : { lottery: q.lottery }) }
      : { ...(q.lottery === "all" ? {} : { lottery: q.lottery }), drawDate: { $gte: q.from, $lte: q.to } },
  ).lean();
  const periodIds = periods.map((p) => p._id);

  const [bills, results, dealers, rateConfig, payments, activities] = await Promise.all([
    Bill.find({ periodId: { $in: periodIds } }).sort({ createdAt: -1 }).lean(),
    PrizeResultModel.find({ periodId: { $in: periodIds } }).lean(),
    Dealer.find().lean(),
    loadRateConfig(),
    // รายการที่ไม่ผูกงวด (periodId ว่าง) แสดงตามประเภทหวย
    PaymentModel.find({ $or: [{ periodId: { $in: periodIds } }, { periodId: "", ...(q.lottery === "all" ? {} : { lottery: q.lottery }) }] }).lean(),
    ActivityModel.find(q.lottery === "all" ? {} : { lottery: q.lottery }).sort({ at: -1 }).lean(),
  ]);

  const resultByPeriod = new Map(results.map((r) => [r.periodId, pubPrize(r)]));
  const dealerOf = new Map<string, string>();
  for (const d of dealers) for (const c of d.collectors) dealerOf.set(c._id, d._id);

  return {
    bills: bills.map((b) => {
      const rates = resolveRates(rateConfig, dealerOf.get(b.collectorId), b.customerId ?? null);
      const pub = pubBill(b);
      return { ...pub, rates, prize: billPrize(pub.lines, pub.lottery, resultByPeriod.get(b.periodId), rates) };
    }),
    payments: payments.filter((p) => inScope(p.lottery)).map(pubPayment) as Payment[],
    activities: activities.filter((a) => inScope(a.lottery)).map(pubActivity) as Activity[],
  };
}
