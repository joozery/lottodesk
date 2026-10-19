// Service เจ้ามือ งวด และ ledger — เรียก API จริง
import type { BetLine, Bill, Dealer, Ledger, LedgerFilter, Period } from "@/lib/types";
import { api } from "./api";

export const fetchDealers = () => api<Dealer[]>("/dealers");

/** งวดที่มีผลรางวัลแล้ว = ยืนยันผลแล้ว */
export const fetchPeriods = () => api<Period[]>("/periods");

export const fetchLedger = (filter: LedgerFilter) =>
  api<Ledger>("/ledger", { query: { lottery: filter.lottery, periodId: filter.periodId ?? undefined, from: filter.from || undefined, to: filter.to || undefined } });

/** คืนเจ้ามือที่อัปเดตแล้ว (รวมลูกค้าใหม่) */
export const createCustomer = (dealerId: string, collectorId: string, name: string) =>
  api<Dealer>(`/dealers/${dealerId}/collectors/${collectorId}/customers`, { method: "POST", body: { name } });

export interface NewBill {
  collectorId: string;
  customerId: string | null;
  periodId: string;
  lines: BetLine[];
  paid?: boolean;
}
export const createBill = (bill: NewBill) => api<Omit<Bill, "prize" | "rates">>("/bills", { method: "POST", body: bill });

export const createDealer = (name: string) => api<Dealer>("/dealers", { method: "POST", body: { name } });

export const createCollector = (dealerId: string, name: string) =>
  api<Dealer>(`/dealers/${dealerId}/collectors`, { method: "POST", body: { name } });

export const renameCollector = (dealerId: string, collectorId: string, name: string) =>
  api<Dealer>(`/dealers/${dealerId}/collectors/${collectorId}`, { method: "PATCH", body: { name } });
