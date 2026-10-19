import { RATES } from "../shared/prize-calc.js";
import type { BetType, Rates } from "../shared/types.js";
import { RateOverride } from "../models.js";

export type RateOverrides = Partial<Rates>;
export interface RateConfig { dealers: Record<string, RateOverrides>; customers: Record<string, RateOverrides> }

export const BET_TYPE_KEYS = Object.keys(RATES) as BetType[];

export async function loadRateConfig(): Promise<RateConfig> {
  const config: RateConfig = { dealers: {}, customers: {} };
  for (const r of await RateOverride.find().lean()) {
    (r.scope === "dealer" ? config.dealers : config.customers)[r.refId] = r.rates as RateOverrides;
  }
  return config;
}

/** อัตราจ่ายที่ใช้จริง: ลูกค้า > เจ้ามือ > เริ่มต้น (ระบุแยกตามประเภทการแทง) */
export function resolveRates(config: RateConfig, dealerId: string | undefined, customerId: string | null): Rates {
  return { ...RATES, ...(dealerId ? config.dealers[dealerId] : undefined), ...(customerId ? config.customers[customerId] : undefined) };
}
