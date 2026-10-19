// ข้อมูลตัวอย่างทั้งหมด — ไม่ได้มาจากระบบจริง
import type { Activity, BetLine, BetType, Bill, Dealer, Payment, Period } from "../shared/types.js";

export const DEALERS: Dealer[] = [
  {
    id: "d-bank",
    name: "นายแบงค์",
    collectors: [
      { id: "c-a", name: "นายเอ", customers: [
        { id: "cus-001", code: "CUS-001", name: "คุณบี" },
        { id: "cus-002", code: "CUS-002", name: "คุณซี" },
      ] },
      { id: "c-boy", name: "นายบอย", customers: [
        { id: "cus-003", code: "CUS-003", name: "คุณดี" },
        { id: "cus-004", code: "CUS-004", name: "คุณอี" },
      ] },
      { id: "c-dew", name: "นายดิว", customers: [{ id: "cus-005", code: "CUS-005", name: "คุณเอฟ" }] },
    ],
  },
  {
    id: "d-ton",
    name: "นายต้น",
    collectors: [
      { id: "c-fil", name: "นายฟิล์ม", customers: [{ id: "cus-006", code: "CUS-006", name: "คุณจี" }] },
    ],
  },
];

/** งวดตัวอย่างหวยลาวในเดือน ต.ค. 2569: ออกทุกวันจันทร์–ศุกร์ */
function laoWeekdayPeriods(): Period[] {
  const periods: Period[] = [];
  for (let day = 1; day <= 30; day += 1) {
    const date = new Date(Date.UTC(2026, 9, day));
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const dd = String(day).padStart(2, "0");
    periods.push({
      id: `lao-10${dd}`,
      lottery: "lao",
      drawDate: `2026-10-${dd}`,
      status: day === 14 || day === 16 ? "confirmed" : "pending",
    });
  }
  return periods;
}

export const PERIODS: Period[] = [
  { id: "th-1101", lottery: "thai", drawDate: "2026-11-01", status: "pending" },
  { id: "th-1016", lottery: "thai", drawDate: "2026-10-16", status: "confirmed" },
  { id: "th-1001", lottery: "thai", drawDate: "2026-10-01", status: "confirmed" },
  ...laoWeekdayPeriods(),
];

let seq = 0;
const L = (type: BetType, number: string, amount: number): BetLine => ({ type, number, amount });

/** amount = ผลรวมของ lines; prize คำนวณตอนโหลดจากผลรางวัลของงวด */
function bill(collectorId: string, customerId: string | null, periodId: string, lines: BetLine[], outstanding = 0): Bill {
  const period = PERIODS.find((p) => p.id === periodId)!;
  seq += 1;
  return {
    id: `bill-${seq}`,
    no: `B-2569-${String(seq).padStart(4, "0")}`,
    collectorId,
    customerId,
    lottery: period.lottery,
    periodId,
    amount: lines.reduce((s, l) => s + l.amount, 0),
    lines,
    prize: 0,
    outstanding,
    createdAt: `${period.drawDate}T09:${String(seq % 60).padStart(2, "0")}:00+07:00`,
  };
}

export const BILLS: Bill[] = [
  // หวยไทย 16 ต.ค. — นายแบงค์ 26,000 / นายต้น 12,000
  bill("c-a", null, "th-1016", [L("top2", "55", 600), L("runTop", "7", 400)]),
  bill("c-a", "cus-001", "th-1016", [L("runTop", "9", 200), L("top2", "77", 500), L("top3", "123", 500)]),
  bill("c-a", "cus-001", "th-1016", [L("top2", "33", 800)]),
  bill("c-a", "cus-002", "th-1016", [L("bottom2", "66", 1000), L("top2", "11", 1000)]),
  bill("c-a", "cus-002", "th-1016", [L("top3", "456", 1000)], 500),
  bill("c-boy", null, "th-1016", [L("top2", "55", 1000), L("bottom2", "44", 1000)]),
  bill("c-boy", "cus-003", "th-1016", [L("runTop", "2", 500), L("bottom2", "12", 3500)], 800),
  bill("c-boy", "cus-003", "th-1016", [L("top2", "33", 2000)]),
  bill("c-boy", "cus-004", "th-1016", [L("bottom2", "66", 2000), L("top3", "789", 2000)]),
  bill("c-dew", null, "th-1016", [L("top2", "77", 1000)]),
  bill("c-dew", "cus-005", "th-1016", [L("bottom2", "44", 3000), L("top2", "11", 4000)], 1000),
  bill("c-fil", null, "th-1016", [L("top2", "55", 4000)]),
  bill("c-fil", "cus-006", "th-1016", [L("runBottom", "5", 500), L("top2", "33", 7500)]),
  // หวยไทย 1 ต.ค.
  bill("c-a", null, "th-1001", [L("top2", "55", 500)]),
  bill("c-a", "cus-001", "th-1001", [L("bottom2", "66", 1000)]),
  bill("c-a", "cus-002", "th-1001", [L("runTop", "4", 500), L("top2", "99", 1500)]),
  bill("c-boy", "cus-003", "th-1001", [L("bottom2", "44", 3000)]),
  // หวยไทย 1 พ.ย. (คีย์ล่วงหน้า รอผล)
  bill("c-a", null, "th-1101", [L("top2", "12", 300)]),
  bill("c-a", "cus-001", "th-1101", [L("runTop", "3", 200), L("bottom2", "21", 500)]),
  // หวยลาว
  bill("c-a", null, "lao-1014", [L("top2", "12", 400)]),
  bill("c-a", "cus-001", "lao-1014", [L("bottom2", "66", 600)]),
  bill("c-a", "cus-002", "lao-1014", [L("runTop", "8", 100), L("top2", "55", 800)], 200),
  bill("c-boy", "cus-004", "lao-1014", [L("top3", "123", 1500)]),
  bill("c-dew", null, "lao-1014", [L("bottom2", "99", 500)]),
  bill("c-a", "cus-001", "lao-1016", [L("runBottom", "6", 100), L("top2", "11", 700)]),
  bill("c-fil", "cus-006", "lao-1016", [L("top2", "55", 1000)]),
  bill("c-a", null, "lao-1019", [L("top2", "12", 200)]),
  bill("c-a", "cus-002", "lao-1019", [L("runTop", "3", 500)]),
  bill("c-boy", null, "lao-1019", [L("bottom2", "88", 300)]),
];

export const ACTIVITIES: Activity[] = [
  { id: "ac-1", at: "2026-10-16T15:42:00+07:00", actor: "แอดมิน", text: "ยืนยันผลรางวัลหวยไทย งวด 16 ต.ค. 2569", collectorId: "c-a", lottery: "thai" },
  { id: "ac-2", at: "2026-10-16T11:05:00+07:00", actor: "นายเอ", text: "คีย์โพยคุณซี จำนวน 1,000 บาท", collectorId: "c-a", lottery: "thai" },
  { id: "ac-3", at: "2026-10-16T10:20:00+07:00", actor: "นายเอ", text: "คีย์โพยคุณบี จำนวน 1,200 บาท", collectorId: "c-a", lottery: "thai" },
  { id: "ac-4", at: "2026-10-16T18:30:00+07:00", actor: "แอดมิน", text: "ยืนยันผลรางวัลหวยลาว งวด 16 ต.ค. 2569", collectorId: "c-a", lottery: "lao" },
  { id: "ac-5", at: "2026-10-14T20:10:00+07:00", actor: "นายเอ", text: "คีย์โพยคุณซี จำนวน 900 บาท", collectorId: "c-a", lottery: "lao" },
  { id: "ac-6", at: "2026-10-16T09:50:00+07:00", actor: "นายบอย", text: "คีย์โพยคุณดี จำนวน 4,000 บาท", collectorId: "c-boy", lottery: "thai" },
  { id: "ac-7", at: "2026-10-16T09:30:00+07:00", actor: "นายดิว", text: "คีย์โพยคุณเอฟ จำนวน 7,000 บาท", collectorId: "c-dew", lottery: "thai" },
  { id: "ac-8", at: "2026-10-16T09:10:00+07:00", actor: "นายฟิล์ม", text: "คีย์โพยคุณจี จำนวน 8,000 บาท", collectorId: "c-fil", lottery: "thai" },
];

export const PAYMENTS: Payment[] = [
  { id: "pay-1", at: "2026-10-02T13:00:00+07:00", collectorId: "c-a", lottery: "thai", periodId: "th-1001", direction: "in", amount: 1500, note: "คุณซี ชำระยอดงวด 1 ต.ค." },
  { id: "pay-2", at: "2026-10-17T10:15:00+07:00", collectorId: "c-a", lottery: "thai", periodId: "th-1016", direction: "out", amount: 600, note: "จ่ายรางวัลคุณบี งวด 16 ต.ค." },
  { id: "pay-3", at: "2026-10-17T14:40:00+07:00", collectorId: "c-a", lottery: "thai", periodId: "th-1016", direction: "in", amount: 2500, note: "คุณซี ชำระบางส่วน งวด 16 ต.ค." },
  { id: "pay-4", at: "2026-10-17T09:00:00+07:00", collectorId: "c-a", lottery: "lao", periodId: "lao-1016", direction: "out", amount: 400, note: "จ่ายรางวัลคุณบี หวยลาว" },
  { id: "pay-5", at: "2026-10-17T16:00:00+07:00", collectorId: "c-boy", lottery: "thai", periodId: "th-1016", direction: "in", amount: 3200, note: "คุณดี ชำระบางส่วน" },
];
