// ผลรางวัลที่ผู้ใช้กรอก เก็บไว้ใน localStorage ของเบราว์เซอร์นี้ (ยังไม่มี backend)
// ผลที่กรอกจะทับผลตัวอย่างของงวดเดียวกัน; เมื่อมี API จริงให้แทนที่ไฟล์นี้
import type { PrizeResult } from "@/lib/prize";
import { PRIZE_RESULTS } from "./mock-results";

const KEY = "lottodesk.prize-results.v1";

function readStored(): PrizeResult[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PrizeResult[]) : [];
  } catch {
    return [];
  }
}

/** คืน false ถ้าเขียนไม่ได้ (เช่น โหมดส่วนตัว หรือพื้นที่เต็ม) */
export function storePrizeResult(result: PrizeResult): boolean {
  try {
    const others = readStored().filter((r) => r.periodId !== result.periodId);
    localStorage.setItem(KEY, JSON.stringify([...others, result]));
    return true;
  } catch {
    return false;
  }
}

/** ผลที่กรอกเอง + ผลตัวอย่างของงวดที่ยังไม่ได้กรอก */
export function allPrizeResults(): PrizeResult[] {
  const stored = readStored();
  const ids = new Set(stored.map((r) => r.periodId));
  return [...stored, ...PRIZE_RESULTS.filter((r) => !ids.has(r.periodId))];
}
