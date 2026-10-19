import type { Bill, Collector, Dealer, Period } from "./types";

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
  own: Totals;
  customers: Totals;
  /** own + customers — คำนวณจากสองส่วนที่แยกขาดกัน จึงไม่นับซ้ำ */
  total: Totals;
}

export function groupSummary(collectorId: string, bills: readonly Bill[], periods: PeriodMap): GroupSummary {
  const mine = bills.filter((b) => b.collectorId === collectorId);
  const own = summarize(mine.filter((b) => b.customerId === null), periods);
  const customers = summarize(mine.filter((b) => b.customerId !== null), periods);
  return { own, customers, total: addTotals(own, customers) };
}

export interface CustomerRow {
  id: string;
  code: string;
  name: string;
  totals: Totals;
}

export function customerRows(collector: Collector, bills: readonly Bill[], periods: PeriodMap): CustomerRow[] {
  return collector.customers.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    totals: summarize(bills.filter((b) => b.customerId === c.id), periods),
  }));
}

export const sumRows = (rows: readonly CustomerRow[]) =>
  rows.reduce((acc, r) => addTotals(acc, r.totals), EMPTY_TOTALS);

export function collectorPurchase(collectorId: string, bills: readonly Bill[]) {
  return bills.reduce((s, b) => (b.collectorId === collectorId ? s + b.amount : s), 0);
}

export function dealerPurchase(dealer: Dealer, bills: readonly Bill[]) {
  const ids = new Set(dealer.collectors.map((c) => c.id));
  return bills.reduce((s, b) => (ids.has(b.collectorId) ? s + b.amount : s), 0);
}
