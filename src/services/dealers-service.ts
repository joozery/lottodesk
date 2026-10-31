// Service เจ้ามือ งวด และ ledger — เรียก API จริง
import type { BetLine, Bill, BillWarning, Dealer, Ledger, LedgerFilter, Period } from "@/lib/types";
import { api } from "./api";

export const fetchDealers = () => api<Dealer[]>("/dealers");

/** งวดที่มีผลรางวัลแล้ว = ยืนยันผลแล้ว */
export const fetchPeriods = () => api<Period[]>("/periods");
export const updateLimitedNumbers = (periodId: string, numbers: string[]) => api<Period>(`/periods/${periodId}/limited-numbers`, { method: "PATCH", body: { numbers } });

export const fetchLedger = (filter: LedgerFilter) =>
  api<Ledger>("/ledger", { query: { lottery: filter.lottery, periodId: filter.periodId ?? undefined, from: filter.from || undefined, to: filter.to || undefined } });

/** คืนเจ้ามือที่อัปเดตแล้ว (รวมลูกค้าใหม่) */
export const createCustomer = (dealerId: string, collectorId: string, name: string) =>
  api<Dealer>(`/dealers/${dealerId}/collectors/${collectorId}/customers`, { method: "POST", body: { name } });
export const updateCustomerDiscount = (dealerId: string, collectorId: string, customerId: string, discountPercent: number) =>
  api<Dealer>(`/dealers/${dealerId}/collectors/${collectorId}/customers/${customerId}`, { method: "PATCH", body: { discountPercent } });

export interface NewBill {
  collectorId: string;
  customerId: string | null;
  periodId: string;
  lines: BetLine[];
  paid?: boolean;
  discountPercent?: number;
  paidAmount?: number;
}
export const createBill = (bill: NewBill) => api<Omit<Bill, "prize" | "rates"> & { warnings?: BillWarning[] }>("/bills", { method: "POST", body: bill });

export const createDealer = (name: string) => api<Dealer>("/dealers", { method: "POST", body: { name } });

export const createCollector = (dealerId: string, name: string) =>
  api<Dealer>(`/dealers/${dealerId}/collectors`, { method: "POST", body: { name } });

export const renameCollector = (dealerId: string, collectorId: string, name: string) =>
  api<Dealer>(`/dealers/${dealerId}/collectors/${collectorId}`, { method: "PATCH", body: { name } });
