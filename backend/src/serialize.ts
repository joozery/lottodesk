// แปลงเอกสาร MongoDB ให้ตรงกับรูปแบบที่ frontend ใช้ (id แทน _id, วันที่เป็น ISO string)
import type { Activity, Bill, Dealer, Payment, Period } from "./shared/types";
import type { PrizeResult } from "./shared/prize";

type Doc = Record<string, any>;
const iso = (d: Date | string) => new Date(d).toISOString();

export const pubPeriod = (d: Doc): Omit<Period, "status"> => ({ id: d._id, lottery: d.lottery, drawDate: d.drawDate, limitedNumbers: d.limitedNumbers ?? [], closedNumbers: d.closedNumbers ?? [], limitedAmounts: d.limitedAmounts ?? {}, limitedRates: d.limitedRates ?? {}, limitedRate: d.limitedRate ?? {}, rates: d.rates ?? {} });

export const pubDealer = (d: Doc): Dealer => ({
  id: d._id,
  name: d.name,
  collectors: (d.collectors ?? []).map((c: Doc) => ({
    id: c._id,
    name: c.name,
    customers: (c.customers ?? []).map((u: Doc) => ({ id: u._id, code: u.code, name: u.name, discountPercent: u.discountPercent ?? 0 })),
  })),
});

/** prize/rates ใส่ทีหลังตอนคำนวณ ledger */
export const pubBill = (d: Doc): Omit<Bill, "prize"> => ({
  id: d._id,
  no: d.no,
  collectorId: d.collectorId,
  customerId: d.customerId ?? null,
  lottery: d.lottery,
  periodId: d.periodId,
  amount: d.amount,
  grossAmount: d.grossAmount ?? d.amount,
  discountPercent: d.discountPercent ?? 0,
  specialDiscountPercent: d.specialDiscountPercent ?? undefined,
  specialNumberDiscountPercent: d.specialNumberDiscountPercent ?? undefined,
  specialRunDiscountPercent: d.specialRunDiscountPercent ?? undefined,
  discountAmount: d.discountAmount ?? 0,
  lines: d.lines.map((l: Doc) => ({ type: l.type, number: l.number, amount: l.amount })),
  // เงินใช้ทศนิยม 2 ตำแหน่ง ป้องกันเศษ floating point ทำให้บิลที่จ่ายครบยังถูกมองว่าค้าง
  outstanding: Math.max(0, Math.round((d.outstanding ?? 0) * 100) / 100),
  rates: d.rates ?? undefined,
  rateOverrides: d.rateOverrides ?? undefined,
  createdAt: iso(d.createdAt),
});

export const pubPayment = (d: Doc): Payment => ({
  id: d._id,
  at: iso(d.at),
  collectorId: d.collectorId,
  lottery: d.lottery,
  periodId: d.periodId ?? "",
  direction: d.direction,
  amount: d.amount,
  note: d.note ?? "",
  customerId: d.customerId ?? null,
  billId: d.billId ?? null,
  recorded: d.recorded,
});

export const pubActivity = (d: Doc): Activity => ({
  id: d._id,
  at: iso(d.at),
  actor: d.actor,
  text: d.text,
  collectorId: d.collectorId,
  lottery: d.lottery,
});

export const pubPrize = (d: Doc): PrizeResult => ({
  periodId: d.periodId,
  announcedAt: iso(d.announcedAt),
  confirmedBy: d.confirmedBy,
  groups: d.groups.map((g: Doc) => ({ key: g.key, label: g.label, numbers: [...g.numbers] })),
});
