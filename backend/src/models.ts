import { randomUUID } from "node:crypto";
import { Schema, model, models } from "mongoose";

// Reuse already-registered models so Next.js dev hot reloads don't throw OverwriteModelError.
const defineModel = ((name: string, schema: Schema) => models[name] ?? model(name, schema)) as typeof model;

const id = () => ({ type: String, default: () => randomUUID() });
const lottery = { type: String, enum: ["thai", "lao"], required: true };
const BET_TYPES = ["top3", "tod3", "bottom3", "top2", "bottom2", "runTop", "runBottom"];

export const User = defineModel("User", new Schema({
  _id: id(),
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff"], default: "admin" },
  /** สิทธิ์เข้าถึงหน้า (ใช้กับ role "staff"; admin ได้ทุกสิทธิ์) */
  permissions: { type: [String], default: [] },
  active: { type: Boolean, default: true },
}, { timestamps: true }));

const customerSchema = new Schema({ _id: id(), code: { type: String, required: true }, name: { type: String, required: true }, discountPercent: { type: Number, default: 0, min: 0, max: 100 } });
const collectorSchema = new Schema({ _id: id(), name: { type: String, required: true }, customers: { type: [customerSchema], default: [] } });
export const Dealer = defineModel("Dealer", new Schema({
  _id: id(),
  name: { type: String, required: true },
  collectors: { type: [collectorSchema], default: [] },
  /** เปอร์เซ็นต์ค่าคอมมิชชันของเจ้ามือ (0–100) */
  commission: { type: Number, default: 0, min: 0, max: 100 },
}, { timestamps: true }));

export const Period = defineModel("Period", new Schema({
  _id: { type: String, required: true },
  lottery,
  drawDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  limitedNumbers: { type: [String], default: [] },
}));

const lineSchema = new Schema({
  type: { type: String, enum: BET_TYPES, required: true },
  number: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });
export const Bill = defineModel("Bill", new Schema({
  _id: id(),
  no: { type: String, required: true, unique: true },
  collectorId: { type: String, required: true, index: true },
  customerId: { type: String, default: null, index: true },
  lottery,
  periodId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  grossAmount: { type: Number },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0, min: 0 },
  lines: { type: [lineSchema], required: true },
  /** ยอดค้างชำระที่เหลือ (ลดลงเมื่อบันทึกรับเงินจากลูกค้า) */
  outstanding: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: () => new Date(), index: true },
}));

export const Payment = defineModel("Payment", new Schema({
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

export const Activity = defineModel("Activity", new Schema({
  _id: id(),
  at: { type: Date, default: () => new Date(), index: true },
  actor: { type: String, required: true },
  text: { type: String, required: true },
  collectorId: { type: String, required: true },
  lottery,
}));

export const PrizeResultModel = defineModel("PrizeResult", new Schema({
  periodId: { type: String, required: true, unique: true },
  announcedAt: { type: Date, required: true },
  confirmedBy: { type: String, required: true },
  groups: [new Schema({ key: String, label: String, numbers: [String] }, { _id: false })],
}));

/** อัตราจ่ายที่ตั้งทับ ต่อเจ้ามือหรือลูกค้า (เก็บเฉพาะประเภทที่ตั้ง) */
export const RateOverride = defineModel("RateOverride", new Schema({
  scope: { type: String, enum: ["global"], required: true },
  refId: { type: String, required: true },
  rates: { type: Schema.Types.Mixed, required: true },
}).index({ scope: 1, refId: 1 }, { unique: true }));

/** ตัวนับเลขที่ต่อเนื่อง เช่น เลขบิล รหัสลูกค้า */
export const Counter = defineModel("Counter", new Schema({ _id: String, seq: { type: Number, default: 0 } }));
export async function nextSeq(name: string): Promise<number> {
  const c = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return c.seq;
}

/** ตั้งค่าทั่วระบบแบบ key–value เช่น วงเงินรับต่อเลข (key "limits") */
export const AppSetting = defineModel("AppSetting", new Schema({ _id: String, value: { type: Schema.Types.Mixed, default: {} } }));

/** แผ่นตีออก: ยอดส่วนเกินที่ส่งต่อให้เจ้ามือรายอื่นรับแทน (1 แผ่นมีหลายเลข) */
export const LayOff = defineModel("LayOff", new Schema({
  _id: id(),
  no: { type: String, required: true, unique: true },
  periodId: { type: String, required: true, index: true },
  lottery,
  /** ชื่อเจ้ามือ/ผู้รับตีออก */
  target: { type: String, default: "" },
  note: { type: String, default: "" },
  lines: { type: [lineSchema], required: true },
  total: { type: Number, required: true },
  actor: { type: String, default: "-" },
  at: { type: Date, default: () => new Date(), index: true },
}));
