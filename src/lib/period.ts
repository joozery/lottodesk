import type { Lottery, Period } from "./types";

/** งวดเริ่มต้น = งวดล่าสุดที่ยืนยันผลแล้ว (ถ้าไม่มี ใช้งวดล่าสุด) */
export function defaultPeriodId(periods: Period[], lottery: Lottery) {
  const list = periods.filter((p) => p.lottery === lottery).sort((a, b) => b.drawDate.localeCompare(a.drawDate));
  return (list.find((p) => p.status === "confirmed") ?? list[0])?.id ?? null;
}
