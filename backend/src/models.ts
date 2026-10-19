import { randomUUID } from "node:crypto";
import { Schema, model } from "mongoose";

const id = () => ({ type: String, default: () => randomUUID() });
const lottery = { type: String, enum: ["thai", "lao"], required: true };
const BET_TYPES = ["top3", "tod3", "bottom3", "top2", "bottom2", "runTop", "runBottom"];

export const User = model("User", new Schema({
  _id: id(),
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff"], default: "admin" },
  /** สิทธิ์เข้าถึงหน้า (ใช้กับ role "staff"; admin ได้ทุกสิทธิ์) */
  permissions: { type: [String], default: [] },
  active: { type: Boolean, default: true },
}, { timestamps: true }));

const customerSchema = new Schema({ _id: id(), code: { type: String, required: true }, name: { type: String, required: true } });
const collectorSchema = new Schema({ _id: id(), name: { type: String, required: true }, customers: { type: [customerSchema], default: [] } });
export const Dealer = model("Dealer", new Schema({
  _id: id(),
  name: { type: String, required: true },
  collectors: { type: [collectorSchema], default: [] },
  /** เปอร์เซ็นต์ค่าคอมมิชชันของเจ้ามือ (0–100) */
  commission: { type: Number, default: 0, min: 0, max: 100 },
}, { timestamps: true }));

export const Period = model("Period", new Schema({
  _id: { type: String, required: true },
  lottery,
  drawDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
}));

const lineSchema = new Schema({
  type: { type: String, enum: BET_TYPES, required: true },
  number: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });
export const Bill = model("Bill", new Schema({
  _id: id(),
  no: { type: String, required: true, unique: true },
  collectorId: { type: String, required: true, index: true },
  customerId: { type: String, default: null, index: true },
  lottery,
  periodId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  lines: { type: [lineSchema], required: true },
  /** ยอดค้างชำระที่เหลือ (ลดลงเมื่อบันทึกรับเงินจากลูกค้า) */
  outstanding: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: () => new Date(), index: true },
}));

export const Payment = model("Payment", new Schema({
  _id: id(),
  at: { type: Date, default: () => new Date(), index: true },
  collectorId: { type: String, required: true },
  lottery,
  /** ว่าง = รายการที่ไม่ผูกกับงวด */
  periodId: { type: String, default: "" },
  direction: { type: String, enum: ["in", "out"], required: true },
  amount: { type: Number, required: true, min: 0 },
  note: { type: String, default: "" },
  customerId: { type: String, default: null },
  /** true = ผู้ใช้บันทึกเอง, false = ข้อมูลตั้งต้น (seed) */
  recorded: { type: Boolean, default: true },
}));

export const Activity = model("Activity", new Schema({
  _id: id(),
  at: { type: Date, default: () => new Date(), index: true },
  actor: { type: String, required: true },
  text: { type: String, required: true },
  collectorId: { type: String, required: true },
  lottery,
}));

export const PrizeResultModel = model("PrizeResult", new Schema({
  periodId: { type: String, required: true, unique: true },
  announcedAt: { type: Date, required: true },
  confirmedBy: { type: String, required: true },
  groups: [new Schema({ key: String, label: String, numbers: [String] }, { _id: false })],
}));

/** อัตราจ่ายที่ตั้งทับ ต่อเจ้ามือหรือลูกค้า (เก็บเฉพาะประเภทที่ตั้ง) */
export const RateOverride = model("RateOverride", new Schema({
  scope: { type: String, enum: ["global"], required: true },
  refId: { type: String, required: true },
  rates: { type: Schema.Types.Mixed, required: true },
}).index({ scope: 1, refId: 1 }, { unique: true }));

/** ตัวนับเลขที่ต่อเนื่อง เช่น เลขบิล รหัสลูกค้า */
export const Counter = model("Counter", new Schema({ _id: String, seq: { type: Number, default: 0 } }));
export async function nextSeq(name: string): Promise<number> {
  const c = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return c.seq;
}
