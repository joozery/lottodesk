import { RATES } from "../shared/prize-calc";
import type { BetType, Rates } from "../shared/types";
import { Dealer, RateOverride } from "../models";

export type RateOverrides = Partial<Rates>;
/** rates = อัตราจ่ายกลางที่ใช้กับทุกคน (ประเภทที่ไม่ได้ตั้งใช้ค่าเริ่มต้น); commissions = เปอร์เซ็นต์ค่าคอมของเจ้ามือแต่ละราย */
export interface RateConfig { rates: RateOverrides; commissions: Record<string, number> }

export const BET_TYPE_KEYS = Object.keys(RATES) as BetType[];

export async function loadRateConfig(): Promise<RateConfig> {
  const [global, dealers] = await Promise.all([RateOverride.findOne({ scope: "global", refId: "default" }).lean(), Dealer.find({}, { commission: 1 }).lean()]);
  return { rates: (global?.rates ?? {}) as RateOverrides, commissions: Object.fromEntries(dealers.map((d) => [d._id, d.commission ?? 0])) };
}

/** อัตราจ่ายที่ใช้จริง: ค่ากลางที่ตั้งไว้ทับค่าเริ่มต้น */
export const resolveRates = (config: RateConfig): Rates => ({ ...RATES, ...config.rates });
