import type { BetType, Exposure, LayoffSheet, Limits, NumberExposure } from "../shared/types";
import { AppSetting, Bill, LayOff } from "../models";

export const BET_TYPES: readonly BetType[] = ["top3", "tod3", "bottom3", "top2", "bottom2", "runTop", "runBottom"];

/** โต๊ดนับเลขที่สลับหลักกันเป็นเลขเดียวกัน (561 = 615) */
export const normNumber = (type: string, number: string) => (type === "tod3" ? [...number].sort().join("") : number);
const keyOf = (type: string, number: string) => `${type}:${normNumber(type, number)}`;

/** ค่าเริ่มต้นเมื่อยังไม่เคยบันทึกวงเงิน: เลข 3 ตัวรับไม่เกิน 500 บาทต่อเลข (ตั้งค่าใหม่/ล้างได้ที่ ตั้งค่า > วงเงินรับ) */
export const DEFAULT_LIMITS: Limits = { top3: 500, tod3: 500, bottom3: 500 };

export async function loadLimits(): Promise<Limits> {
  const doc = await AppSetting.findById("limits").lean();
  if (!doc) return { ...DEFAULT_LIMITS };
  const value = (doc.value ?? {}) as Record<string, unknown>;
  const limits: Limits = {};
  for (const t of BET_TYPES) if (typeof value[t] === "number" && value[t] > 0) limits[t] = value[t];
  return limits;
}

export const pubLayoff = (d: { _id: string; no: string; periodId: string; lottery: string; target?: string | null; note?: string | null; lines: readonly { type: string; number: string; amount: number }[]; total: number; actor?: string | null; at: Date }): LayoffSheet => ({
  id: d._id, no: d.no, periodId: d.periodId, lottery: d.lottery as LayoffSheet["lottery"], target: d.target ?? "", note: d.note ?? "",
  lines: d.lines.map((l) => ({ type: l.type as BetType, number: l.number, amount: l.amount })), total: d.total, actor: d.actor ?? "-", at: d.at.toISOString(),
});

/** ยอดซื้อต่อเลขของงวด เทียบวงเงิน หักยอดที่ตีออกไปแล้ว */
export async function computeExposure(periodId: string): Promise<Exposure> {
  const [limits, bills, sheets] = await Promise.all([
    loadLimits(),
    Bill.find({ periodId }, { lines: 1 }).lean(),
    LayOff.find({ periodId }).sort({ at: -1 }).lean(),
  ]);
  const bought = new Map<string, number>();
  for (const b of bills) for (const l of b.lines) bought.set(keyOf(l.type, l.number), (bought.get(keyOf(l.type, l.number)) ?? 0) + l.amount);
  const laid = new Map<string, number>();
  for (const s of sheets) for (const l of s.lines) laid.set(keyOf(l.type, l.number), (laid.get(keyOf(l.type, l.number)) ?? 0) + l.amount);

  const rows: NumberExposure[] = [...bought].map(([key, total]) => {
    const [type, number] = key.split(":") as [BetType, string];
    const limit = limits[type] ?? null;
    const laidOff = laid.get(key) ?? 0;
    const retained = total - laidOff;
    return {
      type, number, total, limit,
      over: limit === null ? 0 : Math.max(0, total - limit),
      laidOff, retained,
      excess: limit === null ? 0 : Math.max(0, retained - limit),
    };
  });
  rows.sort((a, b) => b.excess - a.excess || b.over - a.over || b.total - a.total || a.number.localeCompare(b.number));
  const sum = (xs: Iterable<number>) => [...xs].reduce((s, n) => s + n, 0);
  return { limits, rows, sheets: sheets.map(pubLayoff), totalBought: sum(bought.values()), totalLaidOff: sum(laid.values()) };
}

/** ส่วนลดอัตโนมัติตามยอดบิล: ต่ำกว่า threshold ลด below% · ตั้งแต่ threshold ขึ้นไปลด atOrAbove% */
export interface DiscountTier { threshold: number; below: number; atOrAbove: number }
export const DEFAULT_DISCOUNT: DiscountTier = { threshold: 20_000, below: 25, atOrAbove: 27 };

export async function loadDiscount(): Promise<DiscountTier> {
  const doc = await AppSetting.findById("discount").lean();
  return { ...DEFAULT_DISCOUNT, ...((doc?.value ?? {}) as Partial<DiscountTier>) };
}
