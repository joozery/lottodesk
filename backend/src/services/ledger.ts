import { billPrize } from "../shared/prize-calc";
import type { Activity, Ledger, LotteryFilter, Payment } from "../shared/types";
import { Activity as ActivityModel, Bill, Dealer, Payment as PaymentModel, Period, PrizeResultModel } from "../models";
import { pubActivity, pubBill, pubPayment, pubPrize } from "../serialize";
import { loadRateConfig, resolveRates } from "./rates";

export interface LedgerQuery {
  lottery: LotteryFilter;
  periodId: string | null;
  /** YYYY-MM-DD ใช้เมื่อ periodId เป็น null */
  from: string;
  to: string;
}

/**
 * periodId พิเศษ (ใช้กับ lottery ที่ไม่ใช่ all) เพื่อให้หน้าเว็บไม่ต้องรอโหลดรายการงวดก่อน:
 * "default" = งวดล่าสุดที่ยืนยันผลแล้ว (ไม่มีใช้งวดล่าสุด) · "open" = งวดแรกที่ยังเปิดรับ (ยังไม่ถึงวันออก/ยังไม่มีผล) ไม่มีใช้งวดล่าสุด
 */
async function resolvePeriodId(lottery: string, mode: "default" | "open"): Promise<string | null> {
  const list = await Period.find({ lottery }).sort({ drawDate: mode === "open" ? 1 : -1 }).lean();
  const first = list[0];
  const last = list.at(-1);
  if (!first || !last) return null;
  const confirmed = new Set((await PrizeResultModel.find({ periodId: { $in: list.map((p) => p._id) } }, { periodId: 1 }).lean()).map((r) => r.periodId));
  if (mode === "default") return (list.find((p) => confirmed.has(p._id)) ?? first)._id;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  return (list.find((p) => !confirmed.has(p._id) && p.drawDate >= today) ?? last)._id;
}

/** บิล รับ–จ่าย และกิจกรรมในขอบเขตที่เลือก พร้อมเงินรางวัลที่คำนวณจากผลรางวัลและอัตราจ่ายของเจ้ามือ/ลูกค้า */
export async function buildLedger(q: LedgerQuery): Promise<Ledger> {
  const inScope = (lottery: string) => q.lottery === "all" || lottery === q.lottery;

  let periodId = q.periodId;
  if ((periodId === "default" || periodId === "open") && q.lottery !== "all") periodId = await resolvePeriodId(q.lottery, periodId) ?? "none";
  const periods = await Period.find(
    periodId
      ? { _id: periodId, ...(q.lottery === "all" ? {} : { lottery: q.lottery }) }
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
    ActivityModel.find(q.lottery === "all" ? {} : { lottery: q.lottery }).sort({ at: -1 }).limit(200).lean(),
  ]);

  const resultByPeriod = new Map(results.map((r) => [r.periodId, pubPrize(r)]));
  const dealerOf = new Map<string, string>();
  for (const d of dealers) for (const c of d.collectors) dealerOf.set(c._id, d._id);

  return {
    bills: bills.map((b) => {
      const rates = resolveRates(rateConfig);
      const pub = pubBill(b);
      return { ...pub, rates, prize: billPrize(pub.lines, pub.lottery, resultByPeriod.get(b.periodId), rates) };
    }),
    payments: payments.filter((p) => inScope(p.lottery)).map(pubPayment) as Payment[],
    activities: activities.filter((a) => inScope(a.lottery)).map(pubActivity) as Activity[],
  };
}
