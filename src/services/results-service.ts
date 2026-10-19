// Service ผลรางวัล — เรียก API จริง
import type { PrizeResult } from "@/lib/prize";
import { api, ApiError } from "./api";

/** null = งวดนี้ยังไม่มีผลรางวัล */
export async function fetchPrizeResult(periodId: string): Promise<PrizeResult | null> {
  try {
    return await api<PrizeResult>(`/prize-results/${periodId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** ผู้ยืนยัน/เวลาประกาศ กำหนดโดยเซิร์ฟเวอร์; throw เมื่อบันทึกไม่สำเร็จ */
export async function savePrizeResult(result: PrizeResult): Promise<{ persisted: true }> {
  await api<PrizeResult>(`/prize-results/${result.periodId}`, {
    method: "PUT",
    body: { groups: result.groups.map((g) => ({ key: g.key, numbers: g.numbers })) },
  });
  return { persisted: true };
}
