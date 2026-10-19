// Service รับ–จ่ายเงิน — เรียก API จริง
import type { LotteryFilter, Payment } from "@/lib/types";
import { api } from "./api";

export interface PaymentFilter {
  lottery: LotteryFilter;
  /** YYYY-MM-DD (ตามวันที่ทำรายการ เวลาไทย) */
  from: string;
  to: string;
}

/** รายการรับ–จ่ายในช่วงวันที่ เรียงใหม่ → เก่า */
export const fetchPayments = (filter: PaymentFilter) =>
  api<Payment[]>("/payments", { query: { lottery: filter.lottery, from: filter.from, to: filter.to } });

/** ยอดค้างชำระของลูกค้าแต่ละราย รวมทุกงวด — ใช้ตรวจจำนวนเงินตอนบันทึกรับ */
export const fetchOutstanding = () => api<Record<string, number>>("/payments/outstanding");

/** บันทึกรับ–จ่าย (รับจากลูกค้า = ตัดยอดค้างบิลเก่าสุดก่อน); throw เมื่อบันทึกไม่สำเร็จ */
export async function savePayment(payment: Omit<Payment, "id" | "at" | "recorded" | "periodId">): Promise<{ persisted: true; payment: Payment }> {
  const saved = await api<Payment>("/payments", {
    method: "POST",
    body: { collectorId: payment.collectorId, lottery: payment.lottery, direction: payment.direction, amount: payment.amount, note: payment.note, customerId: payment.customerId ?? null },
  });
  return { persisted: true, payment: saved };
}
