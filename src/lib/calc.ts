import type { Bill, Dealer, Period } from "./types";

export type PeriodMap = ReadonlyMap<string, Period>;

export interface Totals {
  /** ยอดซื้อทั้งหมด (รวมงวดรอผล) */
  purchase: number;
  /** ยอดซื้อเฉพาะงวดที่ยืนยันผลแล้ว */
  confirmedPurchase: number;
  /** ยอดซื้อของงวดที่ยังรอผล */
  pendingPurchase: number;
  /** ยอดถูกรางวัล นับเฉพาะงวดที่ยืนยันผลแล้ว */
  prize: number;
  outstanding: number;
  /** ได้–เสีย = รางวัล − ยอดซื้อ (เฉพาะงวดที่ยืนยันผลแล้ว) */
  netResult: number;
}

export const EMPTY_TOTALS: Totals = {
  purchase: 0,
  confirmedPurchase: 0,
  pendingPurchase: 0,
  prize: 0,
  outstanding: 0,
  netResult: 0,
};

export function summarize(bills: readonly Bill[], periods: PeriodMap): Totals {
  const t = { ...EMPTY_TOTALS };
  for (const b of bills) {
    t.purchase += b.amount;
    t.outstanding += b.outstanding;
    if (periods.get(b.periodId)?.status === "confirmed") {
      t.confirmedPurchase += b.amount;
      t.prize += b.prize;
    } else {
      t.pendingPurchase += b.amount;
    }
  }
  t.netResult = t.prize - t.confirmedPurchase;
  return t;
}

export function addTotals(a: Totals, b: Totals): Totals {
  return {
    purchase: a.purchase + b.purchase,
    confirmedPurchase: a.confirmedPurchase + b.confirmedPurchase,
    pendingPurchase: a.pendingPurchase + b.pendingPurchase,
    prize: a.prize + b.prize,
    outstanding: a.outstanding + b.outstanding,
    netResult: a.netResult + b.netResult,
  };
}

export interface GroupSummary {
  total: Totals;
}

export function groupSummary(collectorId: string, bills: readonly Bill[], periods: PeriodMap): GroupSummary {
  const mine = bills.filter((b) => b.collectorId === collectorId);
  return { total: summarize(mine, periods) };
}

export function collectorPurchase(collectorId: string, bills: readonly Bill[]) {
  return bills.reduce((s, b) => (b.collectorId === collectorId ? s + b.amount : s), 0);
}

export function dealerPurchase(dealer: Dealer, bills: readonly Bill[]) {
  const ids = new Set(dealer.collectors.map((c) => c.id));
  return bills.reduce((s, b) => (ids.has(b.collectorId) ? s + b.amount : s), 0);
}
