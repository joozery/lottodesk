// Service รับ–จ่ายเงิน — แทนที่ด้วย API จริงได้
import { bangkokDate } from "@/lib/format";
import type { LotteryFilter, Payment } from "@/lib/types";
import { guard } from "./mock-utils";
import { PAYMENTS } from "./mock-data";
import { appendUserPayment, billsAfterReceipts, readUserPayments } from "./payment-store";

export interface PaymentFilter {
  lottery: LotteryFilter;
  /** YYYY-MM-DD (ตามวันที่ทำรายการ เวลาไทย) */
  from: string;
  to: string;
}

/** รายการรับ–จ่ายในช่วงวันที่ เรียงใหม่ → เก่า */
export async function fetchPayments(filter: PaymentFilter): Promise<Payment[]> {
  await guard();
  return [...PAYMENTS, ...readUserPayments()]
    .filter((p) => {
      const day = bangkokDate(p.at);
      return (filter.lottery === "all" || p.lottery === filter.lottery) && day >= filter.from && day <= filter.to;
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** ยอดค้างชำระของลูกค้าแต่ละราย รวมทุกงวด (หลังหักเงินที่รับแล้ว) — ใช้ตรวจจำนวนเงินตอนบันทึกรับ */
export async function fetchOutstanding(): Promise<Record<string, number>> {
  await guard();
  const out: Record<string, number> = {};
  for (const b of billsAfterReceipts()) {
    if (b.customerId && b.outstanding > 0) out[b.customerId] = (out[b.customerId] ?? 0) + b.outstanding;
  }
  return out;
}

/** persisted = เก็บสำเร็จจริงหรือไม่ (false เมื่อเบราว์เซอร์ไม่ให้เขียนข้อมูล) */
export async function savePayment(payment: Omit<Payment, "id" | "at" | "recorded" | "periodId">): Promise<{ persisted: boolean; payment: Payment }> {
  await guard();
  const full: Payment = { ...payment, id: `pay-u-${Date.now()}`, at: new Date().toISOString(), periodId: "", recorded: true };
  return { persisted: appendUserPayment(full), payment: full };
}
