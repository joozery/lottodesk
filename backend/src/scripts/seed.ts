// นำข้อมูลตัวอย่าง (เหมือนที่ frontend ใช้ตอนนี้) เข้า MongoDB
//   npm run seed            ใส่เมื่อฐานข้อมูลยังว่างเท่านั้น
//   npm run seed -- --reset ล้างข้อมูลธุรกิจทั้งหมดก่อนใส่ (ไม่ลบผู้ใช้)
import mongoose from "mongoose";
import { loadConfig } from "../config";
import { Activity, Bill, Counter, Dealer, Payment, Period, PrizeResultModel, RateOverride } from "../models";
import { ACTIVITIES, BILLS, DEALERS, PAYMENTS, PERIODS } from "../seed-data/mock-data";
import { PRIZE_RESULTS } from "../seed-data/mock-results";

const config = loadConfig();
await mongoose.connect(config.MONGODB_URI, { dbName: config.MONGODB_DB, serverSelectionTimeoutMS: 8000 });
console.log(`เชื่อมต่อ db: ${config.MONGODB_DB}`);

const reset = process.argv.includes("--reset");
if (reset) {
  await Promise.all([
    Dealer.deleteMany({}), Period.deleteMany({}), Bill.deleteMany({}), Payment.deleteMany({}),
    Activity.deleteMany({}), PrizeResultModel.deleteMany({}), RateOverride.deleteMany({}), Counter.deleteMany({}),
  ]);
  console.log("ล้างข้อมูลเดิมแล้ว");
} else if (await Dealer.exists({})) {
  console.error("ฐานข้อมูลมีข้อมูลอยู่แล้ว — ใช้ `npm run seed -- --reset` ถ้าต้องการล้างแล้วใส่ใหม่");
  await mongoose.disconnect();
  process.exit(1);
}

await Dealer.insertMany(DEALERS.map((d) => ({
  _id: d.id,
  name: d.name,
  collectors: d.collectors.map((c) => ({ _id: c.id, name: c.name, customers: c.customers.map((u) => ({ _id: u.id, code: u.code, name: u.name })) })),
})));
await Period.insertMany(PERIODS.map((p) => ({ _id: p.id, lottery: p.lottery, drawDate: p.drawDate })));
await Bill.insertMany(BILLS.map((b) => ({
  _id: b.id, no: b.no, collectorId: b.collectorId, customerId: b.customerId, lottery: b.lottery, periodId: b.periodId,
  amount: b.amount, lines: b.lines, outstanding: b.outstanding, createdAt: new Date(b.createdAt),
})));
await Payment.insertMany(PAYMENTS.map((p) => ({ ...p, _id: p.id, at: new Date(p.at), customerId: p.customerId ?? null, recorded: false })));
await Activity.insertMany(ACTIVITIES.map((a) => ({ ...a, _id: a.id, at: new Date(a.at) })));
await PrizeResultModel.insertMany(PRIZE_RESULTS.map((r) => ({ ...r, announcedAt: new Date(r.announcedAt) })));
// เลขบิล/รหัสลูกค้าถัดไปต่อจากข้อมูลตัวอย่าง
await Counter.insertMany([{ _id: "bill", seq: BILLS.length }, { _id: "customer", seq: DEALERS.flatMap((d) => d.collectors.flatMap((c) => c.customers)).length }]);

console.log(`ใส่ข้อมูลแล้ว: เจ้ามือ ${DEALERS.length}, งวด ${PERIODS.length}, บิล ${BILLS.length}, รับ–จ่าย ${PAYMENTS.length}, ผลรางวัล ${PRIZE_RESULTS.length}`);
await mongoose.disconnect();
