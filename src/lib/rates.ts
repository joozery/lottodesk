import { RATES } from "./prize-calc";
import type { Rates } from "./types";

export type RateOverrides = Partial<Rates>;
/** rates = อัตราจ่ายกลางที่ใช้กับทุกคน (ประเภทที่ไม่ได้ตั้งใช้ค่าเริ่มต้น); commissions = % ค่าคอมของเจ้ามือแต่ละราย */
export interface RateConfig {
  rates: RateOverrides;
  commissions: Record<string, number>;
}

export const resolveRates = (config: RateConfig): Rates => ({ ...RATES, ...config.rates });
