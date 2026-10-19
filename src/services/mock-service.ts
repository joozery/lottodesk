// Mock service: แทนที่ฟังก์ชันเหล่านี้ด้วยการเรียก API จริงได้ โดยไม่ต้องแก้ Components
// เปิดหน้าด้วย ?mock=error หรือ ?mock=empty เพื่อดู Error / Empty state
import type { Dealer, Ledger, LedgerFilter, Period } from "@/lib/types";
import { billPrize } from "@/lib/prize-calc";
import { guard, mockMode } from "./mock-utils";
import { allPrizeResults } from "./prize-store";
import { billsAfterReceipts, readUserPayments } from "./payment-store";
import { readRateConfig, resolveRates } from "./rate-store";
import { ACTIVITIES, DEALERS, PAYMENTS, PERIODS } from "./mock-data";


export async function fetchDealers(): Promise<Dealer[]> {
  await guard();
  return DEALERS;
}

/** งวดที่มีผลรางวัลแล้ว = ยืนยันผลแล้ว */
export async function fetchPeriods(): Promise<Period[]> {
  await guard();
  const withResult = new Set(allPrizeResults().map((r) => r.periodId));
  return PERIODS.map((p) => ({ ...p, status: withResult.has(p.id) ? "confirmed" : "pending" }));
}

export async function fetchLedger(filter: LedgerFilter): Promise<Ledger> {
  await guard();
  if (mockMode() === "empty") return { bills: [], activities: [], payments: [] };

  const periodIds = new Set(
    PERIODS.filter((p) => {
      if (filter.periodId) return p.lottery === filter.lottery && p.id === filter.periodId;
      return (filter.lottery === "all" || p.lottery === filter.lottery)
        && p.drawDate >= filter.from && p.drawDate <= filter.to;
    }).map((p) => p.id),
  );
  const periodLottery = (id: string) => PERIODS.find((p) => p.id === id)?.lottery;
  const results = new Map(allPrizeResults().map((r) => [r.periodId, r]));
  const inScope = (lottery: string) => filter.lottery === "all" || lottery === filter.lottery;

  const rateConfig = readRateConfig();
  const dealerOf = (collectorId: string) => DEALERS.find((d) => d.collectors.some((c) => c.id === collectorId))?.id;

  return {
    bills: billsAfterReceipts().filter((b) => periodIds.has(b.periodId)).map((b) => {
      const rates = resolveRates(rateConfig, dealerOf(b.collectorId), b.customerId);
      return { ...b, rates, prize: billPrize(b.lines, b.lottery, results.get(b.periodId), rates) };
    }),
    payments: [
      ...PAYMENTS.filter((p) => periodIds.has(p.periodId) && periodLottery(p.periodId)),
      // รายการที่ผู้ใช้บันทึกเอง ไม่ผูกกับงวด — แสดงตามประเภทหวย
      ...readUserPayments().filter((p) => inScope(p.lottery)),
    ],
    activities: ACTIVITIES.filter((a) => inScope(a.lottery)).sort((a, b) => b.at.localeCompare(a.at)),
  };
}
