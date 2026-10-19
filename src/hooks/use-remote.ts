"use client";

import { useEffect, useState } from "react";

interface Settled<T> {
  key: string;
  data?: T;
  error?: boolean;
}

/**
 * โหลดข้อมูลแบบ async ตาม `key` — key เปลี่ยนเมื่อใดก็เริ่มโหลดใหม่ (loading = true)
 * ส่ง `fetcher = null` เมื่อยังไม่พร้อมโหลด
 */
export function useRemote<T>(key: string, fetcher: (() => Promise<T>) | null, options?: { keepPrevious?: boolean }) {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const enabled = fetcher !== null;

  useEffect(() => {
    if (!fetcher) return;
    let stale = false;
    fetcher().then(
      (data) => !stale && setSettled({ key, data }),
      () => !stale && setSettled({ key, error: true }),
    );
    return () => {
      stale = true;
    };
    // fetcher ถูกสร้างใหม่ทุก render; key เป็นตัวแทนของ input ทั้งหมด
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const current = settled?.key === key ? settled : null;
  return {
    // keepPrevious: ระหว่างโหลดรอบใหม่ ยังคืนข้อมูลรอบก่อน เพื่อไม่ให้หน้ากะพริบเป็น skeleton
    data: current?.data ?? (options?.keepPrevious ? settled?.data ?? null : null),
    error: current?.error === true,
    loading: enabled && current === null,
  };
}
