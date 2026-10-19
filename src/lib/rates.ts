import { RATES } from "./prize-calc";
import type { Rates } from "./types";

export type RateOverrides = Partial<Rates>;
export interface RateConfig {
  dealers: Record<string, RateOverrides>;
  customers: Record<string, RateOverrides>;
}

/** อัตราจ่ายที่ใช้จริง: ลูกค้า > เจ้ามือ > เริ่มต้น (ระบุแยกตามประเภทการแทง) */
export function resolveRates(config: RateConfig, dealerId: string | undefined, customerId: string | null): Rates {
  return { ...RATES, ...(dealerId ? config.dealers[dealerId] : undefined), ...(customerId ? config.customers[customerId] : undefined) };
}
