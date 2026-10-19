// Service อัตราจ่าย (บาทละ) แยกตามเจ้ามือ/ลูกค้า — เรียก API จริง
import type { RateConfig, RateOverrides } from "@/lib/rates";
import { api } from "./api";

export const fetchRates = () => api<RateConfig>("/rates");

/** ส่ง {} เพื่อล้างกลับไปใช้ค่าสืบทอด; คืนค่าตั้งทั้งหมดที่อัปเดตแล้ว */
export const saveRates = (scope: "dealer" | "customer", id: string, rates: RateOverrides) =>
  api<RateConfig>(`/rates/${scope}/${id}`, { method: "PUT", body: rates });
