// Service วงเงินรับ ยอดซื้อต่อเลข และแผ่นตีออก — เรียก API จริง
import type { DiscountConfig } from "@/lib/discount";
import type { BetLine, Exposure, LayoffSheet, Limits } from "@/lib/types";
import { api } from "./api";

export const fetchLimits = () => api<Limits>("/risk/limits");
/** ส่ง {} เพื่อยกเลิกวงเงินทั้งหมด */
export const saveLimits = (limits: Limits) => api<Limits>("/risk/limits", { method: "PUT", body: limits });
export const fetchExposure = (periodId: string) => api<Exposure>(`/risk/exposure/${periodId}`);
export const fetchTargets = () => api<string[]>("/risk/targets");
export const createLayoff = (body: { periodId: string; target: string; note: string; lines: BetLine[] }) => api<LayoffSheet>("/risk/layoffs", { method: "POST", body });
export const deleteLayoff = (id: string) => api<void>(`/risk/layoffs/${id}`, { method: "DELETE" });

export const fetchDiscountTier = () => api<DiscountConfig>("/risk/discount");
export const saveDiscountTier = (discounts: DiscountConfig) => api<DiscountConfig>("/risk/discount", { method: "PUT", body: discounts });
