// แปลงเอกสาร MongoDB ให้ตรงกับรูปแบบที่ frontend ใช้ (id แทน _id, วันที่เป็น ISO string)
import type { Activity, Bill, Dealer, Payment, Period } from "./shared/types.js";
import type { PrizeResult } from "./shared/prize.js";

type Doc = Record<string, any>;
const iso = (d: Date | string) => new Date(d).toISOString();

export const pubPeriod = (d: Doc): Omit<Period, "status"> => ({ id: d._id, lottery: d.lottery, drawDate: d.drawDate });

export const pubDealer = (d: Doc): Dealer => ({
  id: d._id,
  name: d.name,
  collectors: (d.collectors ?? []).map((c: Doc) => ({
    id: c._id,
    name: c.name,
    customers: (c.customers ?? []).map((u: Doc) => ({ id: u._id, code: u.code, name: u.name })),
  })),
});

/** prize/rates ใส่ทีหลังตอนคำนวณ ledger */
export const pubBill = (d: Doc): Omit<Bill, "prize" | "rates"> => ({
  id: d._id,
  no: d.no,
  collectorId: d.collectorId,
  customerId: d.customerId ?? null,
  lottery: d.lottery,
  periodId: d.periodId,
  amount: d.amount,
  lines: d.lines.map((l: Doc) => ({ type: l.type, number: l.number, amount: l.amount })),
  outstanding: d.outstanding,
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
