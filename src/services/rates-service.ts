// Service อัตราจ่าย (บาทละ) และค่าคอมมิชชันเจ้ามือ — เรียก API จริง
import type { RateConfig, RateOverrides } from "@/lib/rates";
import { api } from "./api";

export const fetchRates = () => api<RateConfig>("/rates");

/** อัตราจ่ายกลางที่ใช้กับทุกคน; ส่ง {} เพื่อกลับไปใช้ค่าเริ่มต้น */
export const saveRates = (rates: RateOverrides) => api<RateConfig>("/rates", { method: "PUT", body: rates });

export const saveCommission = (dealerId: string, percent: number) =>
  api<RateConfig>(`/rates/commission/${dealerId}`, { method: "PUT", body: { percent } });
