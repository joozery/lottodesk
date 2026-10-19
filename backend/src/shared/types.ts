export type Lottery = "thai" | "lao";
export type LotteryFilter = "all" | Lottery;

export interface Period {
  id: string;
  lottery: Lottery;
  /** YYYY-MM-DD */
  drawDate: string;
  status: "confirmed" | "pending";
}

export interface Customer {
  id: string;
  code: string;
  name: string;
}

export interface Collector {
  id: string;
  name: string;
  customers: Customer[];
}

export interface Dealer {
  id: string;
  name: string;
  collectors: Collector[];
}

export type BetType = "top3" | "tod3" | "bottom3" | "top2" | "bottom2" | "runTop" | "runBottom";

export interface BetLine {
  type: BetType;
  number: string;
  amount: number;
}

/** อัตราจ่าย (จ่ายกี่เท่าของยอดแทง) ของแต่ละประเภทการแทง */
export type Rates = Record<BetType, number>;

export interface Bill {
  id: string;
  no: string;
  collectorId: string;
  /** null = โพยตัวเองของผู้รวบรวม */
  customerId: string | null;
  lottery: Lottery;
  periodId: string;
  /** ผลรวมของ lines */
  amount: number;
  lines: BetLine[];
  /** เงินรางวัล คำนวณจากผลรางวัลของงวด (0 ถ้ายังไม่มีผล) */
  prize: number;
  /** อัตราจ่ายที่ใช้คำนวณบิลนี้ (ตามเจ้ามือ/ลูกค้า) — ไม่ระบุ = อัตราเริ่มต้น */
  rates?: Rates;
  /** ยอดค้างชำระของบิลนี้ (0 = ชำระแล้ว) */
  outstanding: number;
  createdAt: string;
}

export interface Activity {
  id: string;
  at: string;
  actor: string;
  text: string;
  collectorId: string;
  lottery: Lottery;
}

export interface Payment {
  id: string;
  at: string;
  collectorId: string;
  lottery: Lottery;
  periodId: string;
  direction: "in" | "out";
  amount: number;
  note: string;
  /** ลูกค้าที่เกี่ยวข้อง (รับเงินจากลูกค้ารายนี้ → หักยอดค้างชำระ) */
  customerId?: string | null;
  /** true = ผู้ใช้บันทึกเอง (เก็บในเบราว์เซอร์), ไม่มี = ข้อมูลตัวอย่าง */
  recorded?: boolean;
}

export interface Ledger {
  bills: Bill[];
  activities: Activity[];
  payments: Payment[];
}

export interface LedgerFilter {
  lottery: LotteryFilter;
  /** ระบุงวดเดียว; null ใช้ช่วงวันที่กับประเภทหวยที่เลือก */
  periodId: string | null;
  /** YYYY-MM-DD ใช้เมื่อ periodId เป็น null */
  from: string;
  to: string;
}
