import type { BetLine, BetType, Lottery, Rates } from "./types.js";
import type { PrizeResult } from "./prize.js";

export const BET_LABEL: Record<BetType, string> = {
  top3: "3 ตัวบน",
  tod3: "3 ตัวโต๊ด",
  bottom3: "3 ตัวล่าง",
  top2: "2 ตัวบน",
  bottom2: "2 ตัวล่าง",
  runTop: "วิ่งบน",
  runBottom: "วิ่งล่าง",
};

/** อัตราจ่ายเริ่มต้น (จ่ายกี่เท่าของยอดแทง) — เจ้ามือ/ลูกค้าแต่ละรายตั้งทับได้ที่หน้าตั้งค่า > อัตราจ่าย */
export const RATES: Rates = {
  top3: 500,
  tod3: 100,
  bottom3: 100,
  top2: 70,
  bottom2: 70,
  runTop: 3,
  runBottom: 4,
};

/** เลขที่ใช้ตัดสินแต่ละประเภทการแทง จากผลรางวัลที่กรอก */
export interface PayoutNumbers {
  top3: string;
  top2: string;
  bottom2: string;
  /** หวยไทย: เลขหน้า 3 ตัว + เลขท้าย 3 ตัว; หวยลาว: ไม่มี */
  bottom3: string[];
}

const nums = (result: PrizeResult, key: string) => result.groups.find((g) => g.key === key)?.numbers ?? [];

export function payoutNumbers(lottery: Lottery, result: PrizeResult): PayoutNumbers {
  if (lottery === "thai") {
    const first = nums(result, "first")[0] ?? "";
    return {
      top3: first.slice(-3),
      top2: first.slice(-2),
      bottom2: nums(result, "last2")[0] ?? "",
      bottom3: [...nums(result, "front3"), ...nums(result, "last3")],
    };
  }
  // หวยลาว: เลข 4 ตัว ABCD → 3 ตัวบน = BCD, 2 ตัวบน = CD, 2 ตัวล่าง = AB
  const four = nums(result, "four")[0] ?? "";
  return { top3: four.slice(1), top2: four.slice(2), bottom2: four.slice(0, 2), bottom3: [] };
}

const sortDigits = (s: string) => Array.from(s).sort().join("");

function isWin(line: BetLine, p: PayoutNumbers): boolean {
  switch (line.type) {
    case "top3": return line.number === p.top3;
    case "tod3": return sortDigits(line.number) === sortDigits(p.top3);
    case "bottom3": return p.bottom3.includes(line.number);
    case "top2": return line.number === p.top2;
    case "bottom2": return line.number === p.bottom2;
    case "runTop": return p.top3.includes(line.number);
    case "runBottom": return p.bottom2.includes(line.number);
  }
}

/** เงินรางวัลของรายการแทงเดียว (0 = ไม่ถูก) */
export function linePrize(line: BetLine, lottery: Lottery, result: PrizeResult, rates: Rates = RATES): number {
  return isWin(line, payoutNumbers(lottery, result)) ? line.amount * rates[line.type] : 0;
}

export function billPrize(lines: readonly BetLine[], lottery: Lottery, result: PrizeResult | undefined, rates: Rates = RATES): number {
  if (!result) return 0;
  const p = payoutNumbers(lottery, result);
  return lines.reduce((sum, l) => sum + (isWin(l, p) ? l.amount * rates[l.type] : 0), 0);
}
