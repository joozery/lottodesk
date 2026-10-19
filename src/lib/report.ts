import { addTotals, summarize, EMPTY_TOTALS, type PeriodMap, type Totals } from "./calc";
import type { Bill, Dealer, Lottery, Period } from "./types";

/** กำไร–ขาดทุนของเจ้ามือ = ยอดขาย − เงินรางวัล เฉพาะงวดที่ยืนยันผลแล้ว (null = ยังไม่มีผล) */
export const profitOf = (t: Totals) => t.confirmedPurchase - t.prize;

export interface PeriodRow {
  period: Period;
  totals: Totals;
  /** null = งวดรอผล */
  profit: number | null;
}

/** แถวรายงานรายงวด เรียงเก่า → ใหม่ (เฉพาะงวดที่มียอดขาย) */
export function periodRows(bills: readonly Bill[], periods: readonly Period[], map: PeriodMap): PeriodRow[] {
  return periods
    .map((period) => {
      const totals = summarize(bills.filter((b) => b.periodId === period.id), map);
      return { period, totals, profit: period.status === "confirmed" ? profitOf(totals) : null };
    })
    .filter((r) => r.totals.purchase > 0)
    .sort((a, b) => a.period.drawDate.localeCompare(b.period.drawDate));
}

export interface ReportTotals extends Totals {
  profit: number;
}

export function reportTotals(rows: readonly PeriodRow[]): ReportTotals {
  const t = rows.reduce((acc, r) => addTotals(acc, r.totals), EMPTY_TOTALS);
  return { ...t, profit: profitOf(t) };
}

export interface DealerRow {
  dealer: Dealer;
  totals: Totals;
}

export function dealerRows(dealers: readonly Dealer[], bills: readonly Bill[], map: PeriodMap): DealerRow[] {
  return dealers
    .map((dealer) => {
      const ids = new Set(dealer.collectors.map((c) => c.id));
      return { dealer, totals: summarize(bills.filter((b) => ids.has(b.collectorId)), map) };
    })
    .sort((a, b) => b.totals.purchase - a.totals.purchase);
}

export interface DebtorRow {
  key: string;
  collectorId: string;
  customerId: string | null;
  name: string;
  code: string | null;
  collector: string;
  dealer: string;
  billCount: number;
  amount: number;
}

/** ลูกหนี้ค้างชำระ รวมตามลูกค้า (โพยตัวเองของผู้รวบรวมนับเป็นรายการของผู้รวบรวม) */
export function debtorRows(dealers: readonly Dealer[], bills: readonly Bill[]): DebtorRow[] {
  const rows = new Map<string, DebtorRow>();
  for (const b of bills) {
    if (b.outstanding <= 0) continue;
    const dealer = dealers.find((d) => d.collectors.some((c) => c.id === b.collectorId));
    const collector = dealer?.collectors.find((c) => c.id === b.collectorId);
    const customer = collector?.customers.find((c) => c.id === b.customerId);
    const key = b.customerId ?? `own:${b.collectorId}`;
    const row = rows.get(key) ?? {
      key,
      collectorId: b.collectorId,
      customerId: b.customerId,
      name: customer?.name ?? `${collector?.name ?? "-"} (โพยตัวเอง)`,
      code: customer?.code ?? null,
      collector: collector?.name ?? "-",
      dealer: dealer?.name ?? "-",
      billCount: 0,
      amount: 0,
    };
    row.billCount += 1;
    row.amount += b.outstanding;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.amount - a.amount);
}

export const lotteryName: Record<Lottery, string> = { thai: "หวยไทย", lao: "หวยลาว" };
