/** ส่วนลดอัตโนมัติตามยอดบิลก่อนหักส่วนลด: ต่ำกว่า threshold ลด below% · ตั้งแต่ threshold ขึ้นไปลด atOrAbove% */
export interface DiscountTier {
  threshold: number;
  below: number;
  atOrAbove: number;
}

/** ค่าเริ่มต้นเมื่อยังไม่เคยตั้งค่า (ต้องตรงกับ backend/src/services/risk.ts) */
export const DEFAULT_DISCOUNT: DiscountTier = { threshold: 20_000, below: 25, atOrAbove: 27 };

export const tierDiscountPercent = (gross: number, tier: DiscountTier = DEFAULT_DISCOUNT) => (gross >= tier.threshold ? tier.atOrAbove : tier.below);
