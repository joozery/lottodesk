"use client";

import { useRemote } from "./use-remote";
import { fetchDealers, fetchLedger, fetchPeriods } from "@/services/dealers-service";
import type { LedgerFilter, Period } from "@/lib/types";

/**
 * โหลดเจ้ามือ งวด และรายการบิลตามตัวกรอง
 * `buildFilter` รับรายการงวดที่โหลดแล้ว (เพื่อหางวดเริ่มต้น) แล้วคืนตัวกรอง; คืน null = ยังไม่พร้อม
 */
export function useDealersData(nonce: number, buildFilter: (periods: Period[]) => LedgerFilter | null, buildRequest?: () => LedgerFilter | null) {
  const dealers = useRemote(`dealers-${nonce}`, fetchDealers);
  const periods = useRemote(`periods-${nonce}`, fetchPeriods);
  // filter = ตัวกรองที่ใช้แสดงผล (ต้องรอรายการงวด); request = ตัวกรองที่ส่งไปโหลดบิลทันทีโดยไม่รอรายการงวด
  // (periodId "default" ให้เซิร์ฟเวอร์เลือกงวดเริ่มต้นให้) — หน้าที่ไม่ส่งมาจะใช้ filter ซึ่งไม่ต้องรองวดอยู่แล้วเมื่อเลือกช่วงวันที่
  const filter = buildFilter(periods.data ?? []);
  const request = buildRequest ? buildRequest() : filter;
  const ledger = useRemote(
    `ledger-${nonce}-${JSON.stringify(request)}`,
    request ? () => fetchLedger(request) : null,
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
