// Service ผลรางวัล — ตอนนี้เก็บใน localStorage ผ่าน prize-store แทนที่ด้วย API จริงได้
import type { PrizeResult } from "@/lib/prize";
import { guard } from "./mock-utils";
import { allPrizeResults, storePrizeResult } from "./prize-store";

/** null = งวดนี้ยังไม่มีผลรางวัล */
export async function fetchPrizeResult(periodId: string): Promise<PrizeResult | null> {
  await guard();
  return allPrizeResults().find((r) => r.periodId === periodId) ?? null;
}

/** persisted = เก็บสำเร็จจริงหรือไม่ (false เมื่อเบราว์เซอร์ไม่ให้เขียนข้อมูล) */
export async function savePrizeResult(result: PrizeResult): Promise<{ persisted: boolean }> {
  await guard();
  return { persisted: storePrizeResult(result) };
}
