// รายการรับ–จ่ายที่ผู้ใช้บันทึก เก็บใน localStorage ของเบราว์เซอร์นี้ (ยังไม่มี backend)
// เมื่อมี API จริงให้แทนที่ไฟล์นี้
import type { Bill, Payment } from "@/lib/types";
import { BILLS } from "./mock-data";

const KEY = "lottodesk.payments.v1";

export function readUserPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Payment[]) : [];
  } catch {
    return [];
  }
}

/** คืน false ถ้าเขียนไม่ได้ (เช่น โหมดส่วนตัว หรือพื้นที่เต็ม) */
export function appendUserPayment(payment: Payment): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify([...readUserPayments(), payment]));
    return true;
  } catch {
    return false;
  }
}

/**
 * บิลทั้งหมด หลังหักเงินที่ผู้ใช้บันทึกว่า "รับจากลูกค้า" —
 * ตัดยอดค้างของบิลเก่าที่สุดก่อน (FIFO) เพื่อให้ทุกหน้าเห็นยอดค้างตรงกัน
 */
export function billsAfterReceipts(): Bill[] {
  const bills = BILLS.map((b) => ({ ...b }));
  const received = new Map<string, number>();
  for (const p of readUserPayments()) {
    if (p.direction === "in" && p.customerId) received.set(p.customerId, (received.get(p.customerId) ?? 0) + p.amount);
  }
  for (const [customerId, total] of received) {
    let left = total;
    const owed = bills
      .filter((b) => b.customerId === customerId && b.outstanding > 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const bill of owed) {
      const take = Math.min(bill.outstanding, left);
      bill.outstanding -= take;
      left -= take;
      if (left === 0) break;
    }
  }
  return bills;
}
