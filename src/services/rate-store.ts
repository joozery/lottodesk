// อัตราจ่ายที่ผู้ใช้ตั้งเอง เก็บใน localStorage ของเบราว์เซอร์นี้ (ยังไม่มี backend)
// ลำดับความสำคัญ: ลูกค้า > เจ้ามือ > อัตราเริ่มต้น (RATES); เมื่อมี API จริงให้แทนที่ไฟล์นี้
import { RATES } from "@/lib/prize-calc";
import type { Rates } from "@/lib/types";

export type RateOverrides = Partial<Rates>;
export interface RateConfig {
  dealers: Record<string, RateOverrides>;
  customers: Record<string, RateOverrides>;
}

const KEY = "lottodesk.rates.v1";
const empty = (): RateConfig => ({ dealers: {}, customers: {} });

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** เก็บเฉพาะค่าที่เป็นเลขบวก */
function clean(v: unknown): RateOverrides {
  const out: RateOverrides = {};
  if (!isRecord(v)) return out;
  for (const type of Object.keys(RATES) as (keyof Rates)[]) {
    const n = v[type];
    if (typeof n === "number" && Number.isFinite(n) && n > 0) out[type] = n;
  }
  return out;
}

export function readRateConfig(): RateConfig {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!isRecord(raw)) return empty();
    const section = (s: unknown) => Object.fromEntries(Object.entries(isRecord(s) ? s : {}).map(([id, o]) => [id, clean(o)]));
    return { dealers: section(raw.dealers), customers: section(raw.customers) };
  } catch {
    return empty();
  }
}

/** คืน false ถ้าเขียนไม่ได้ (เช่น โหมดส่วนตัว หรือพื้นที่เต็ม) */
export function saveRateConfig(config: RateConfig): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

/** อัตราจ่ายที่ใช้จริง: ลูกค้า > เจ้ามือ > เริ่มต้น (ระบุแยกตามประเภทการแทง) */
export function resolveRates(config: RateConfig, dealerId: string | undefined, customerId: string | null): Rates {
  return { ...RATES, ...(dealerId ? config.dealers[dealerId] : undefined), ...(customerId ? config.customers[customerId] : undefined) };
}
