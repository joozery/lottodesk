import type { Bill, Dealer, Period } from "./types";

export interface BillView {
  bill: Bill;
  customer: string;
  /** รหัสลูกค้า (null = โพยตัวเองของผู้รวบรวม) */
  code: string | null;
  collector: string;
  dealer: string;
  period: Period | undefined;
}

export function describeBill(bill: Bill, dealers: readonly Dealer[], period: Period | undefined): BillView {
  const dealer = dealers.find((d) => d.collectors.some((c) => c.id === bill.collectorId));
  const collector = dealer?.collectors.find((c) => c.id === bill.collectorId);
  const customer = collector?.customers.find((c) => c.id === bill.customerId);
  return {
    bill,
    customer: customer?.name ?? `${collector?.name ?? "-"} (โพยตัวเอง)`,
    code: customer?.code ?? null,
    collector: collector?.name ?? "-",
    dealer: dealer?.name ?? "-",
    period,
  };
}

export type BillResult = "pending" | "won" | "lost";

/** ผลของบิล: งวดยังไม่ยืนยันผล = รอผล */
export const resultOf = (v: BillView): BillResult =>
  v.period?.status !== "confirmed" ? "pending" : v.bill.prize > 0 ? "won" : "lost";

export type StatusFilter = "all" | "paid" | "unpaid" | "won" | "pending";

export const matchesStatus = (v: BillView, f: StatusFilter) =>
  f === "all" || (f === "paid" && v.bill.outstanding <= 0) || (f === "unpaid" && v.bill.outstanding > 0) || (f === "won" && resultOf(v) === "won") || (f === "pending" && resultOf(v) === "pending");

export type SortKey = "newest" | "oldest" | "amount" | "outstanding";

export const SORTERS: Record<SortKey, (a: BillView, b: BillView) => number> = {
  newest: (a, b) => b.bill.createdAt.localeCompare(a.bill.createdAt),
  oldest: (a, b) => a.bill.createdAt.localeCompare(b.bill.createdAt),
  amount: (a, b) => b.bill.amount - a.bill.amount,
  outstanding: (a, b) => b.bill.outstanding - a.bill.outstanding || b.bill.createdAt.localeCompare(a.bill.createdAt),
};

export function matchesQuery(v: BillView, query: string) {
  const q = query.trim().toLowerCase();
  return !q || [v.bill.no, v.customer, v.code ?? "", v.collector, v.dealer].some((s) => s.toLowerCase().includes(q));
}

export type PaymentStatus = "paid" | "partial" | "unpaid";

/** ชำระแล้ว = ไม่มียอดค้าง · ชำระบางส่วน = ค้างน้อยกว่ายอดบิล · ค้างชำระ = ยังไม่ได้ชำระเลย */
export const paymentStatusOf = (bill: Pick<Bill, "amount" | "outstanding">): PaymentStatus =>
  bill.outstanding <= 0 ? "paid" : bill.outstanding < bill.amount ? "partial" : "unpaid";

export const PAYMENT_LABEL: Record<PaymentStatus, string> = { paid: "ชำระแล้ว", partial: "ชำระบางส่วน", unpaid: "ค้างชำระ" };
