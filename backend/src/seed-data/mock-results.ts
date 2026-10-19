// ผลรางวัลตัวอย่าง — ไม่ใช่ผลจริง
import type { PrizeResult } from "../shared/prize";

export const PRIZE_RESULTS: PrizeResult[] = [
  {
    periodId: "th-1016",
    announcedAt: "2026-10-16T15:42:00+07:00",
    confirmedBy: "แอดมิน",
    groups: [
      { key: "first", label: "รางวัลที่ 1", numbers: ["483920"] },
      { key: "front3", label: "เลขหน้า 3 ตัว", numbers: ["482", "915"] },
      { key: "last3", label: "เลขท้าย 3 ตัว", numbers: ["071", "336"] },
      { key: "last2", label: "เลขท้าย 2 ตัว", numbers: ["58"] },
    ],
  },
  {
    periodId: "th-1001",
    announcedAt: "2026-10-01T15:40:00+07:00",
    confirmedBy: "แอดมิน",
    groups: [
      { key: "first", label: "รางวัลที่ 1", numbers: ["207415"] },
      { key: "front3", label: "เลขหน้า 3 ตัว", numbers: ["634", "108"] },
      { key: "last3", label: "เลขท้าย 3 ตัว", numbers: ["559", "802"] },
      { key: "last2", label: "เลขท้าย 2 ตัว", numbers: ["17"] },
    ],
  },
  {
    periodId: "lao-1016",
    announcedAt: "2026-10-16T18:30:00+07:00",
    confirmedBy: "แอดมิน",
    groups: [
      { key: "four", label: "เลข 4 ตัว", numbers: ["6024"] },
    ],
  },
  {
    periodId: "lao-1014",
    announcedAt: "2026-10-14T20:10:00+07:00",
    confirmedBy: "แอดมิน",
    groups: [
      { key: "four", label: "เลข 4 ตัว", numbers: ["3871"] },
    ],
  },
];
