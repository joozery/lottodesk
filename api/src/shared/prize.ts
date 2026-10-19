import type { Lottery } from "./types.js";

export interface PrizeGroup {
  key: string;
  label: string;
  numbers: string[];
}

export interface PrizeResult {
  periodId: string;
  announcedAt: string;
  confirmedBy: string;
  groups: PrizeGroup[];
}

export interface PrizeSpecItem {
  key: string;
  label: string;
  digits: number;
  count: number;
  /** รางวัลหลัก แสดงเป็นแผ่นใหญ่ */
  primary?: boolean;
}

/** โครงสร้างรางวัลของแต่ละประเภทหวย (ใช้ทั้งแสดงผลและตรวจฟอร์มบันทึกผล) */
export const PRIZE_SPEC: Record<Lottery, PrizeSpecItem[]> = {
  thai: [
    { key: "first", label: "รางวัลที่ 1", digits: 6, count: 1, primary: true },
    { key: "front3", label: "เลขหน้า 3 ตัว", digits: 3, count: 2 },
    { key: "last3", label: "เลขท้าย 3 ตัว", digits: 3, count: 2 },
    { key: "last2", label: "เลขท้าย 2 ตัว", digits: 2, count: 1 },
  ],
  lao: [
    { key: "four", label: "เลข 4 ตัว", digits: 4, count: 1, primary: true },
  ],
};
