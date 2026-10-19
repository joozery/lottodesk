"use client";

import { useRemote } from "./use-remote";
import { fetchDealers, fetchLedger, fetchPeriods } from "@/services/dealers-service";
import type { LedgerFilter, Period } from "@/lib/types";

/**
 * โหลดเจ้ามือ งวด และรายการบิลตามตัวกรอง
 * `buildFilter` รับรายการงวดที่โหลดแล้ว (เพื่อหางวดเริ่มต้น) แล้วคืนตัวกรอง; คืน null = ยังไม่พร้อม
 */
export function useDealersData(nonce: number, buildFilter: (periods: Period[]) => LedgerFilter | null) {
  const dealers = useRemote(`dealers-${nonce}`, fetchDealers);
  const periods = useRemote(`periods-${nonce}`, fetchPeriods);
  const filter = periods.data ? buildFilter(periods.data) : null;
  const ledger = useRemote(
    `ledger-${nonce}-${JSON.stringify(filter)}`,
    filter ? () => fetchLedger(filter) : null,
    { keepPrevious: true },
  );

  return {
    dealers: dealers.data,
    periods: periods.data,
    ledger: ledger.data,
    filter,
    baseLoading: dealers.loading || periods.loading,
    ledgerLoading: ledger.loading,
    error: dealers.error || periods.error || ledger.error,
  };
}
