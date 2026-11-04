import mongoose from "mongoose";
import { loadConfig } from "../config";
import { Bill } from "../models";
import { loadDiscount } from "../services/risk";

const config = loadConfig();
const discount = await loadDiscount();
const runPercent = discount.defaults.run;

await mongoose.connect(config.MONGODB_URI, {
  dbName: config.MONGODB_DB,
  serverSelectionTimeoutMS: 8000,
});

const bills = await Bill.find({ $or: [{ specialRunDiscountPercent: { $exists: false } }, { specialRunDiscountPercent: { $ne: runPercent } }] });
let changed = 0;

for (const bill of bills) {
  const grossAmount = bill.grossAmount ?? bill.lines.reduce((sum, line) => sum + line.amount, 0);
  const numberGross = bill.lines
    .filter((line) => line.type !== "runTop" && line.type !== "runBottom")
    .reduce((sum, line) => sum + line.amount, 0);
  const runGross = grossAmount - numberGross;
  const numberPercent = bill.specialNumberDiscountPercent ?? bill.discountPercent ?? 0;
  const discountAmount = Math.round((numberGross * numberPercent + runGross * runPercent)) / 100;
  const amount = Math.round((grossAmount - discountAmount) * 100) / 100;
  const paidAmount = Math.max(0, bill.amount - bill.outstanding);

  bill.grossAmount = grossAmount;
  bill.specialDiscountPercent = numberPercent;
  bill.specialNumberDiscountPercent = numberPercent;
  bill.specialRunDiscountPercent = runPercent;
  bill.discountAmount = discountAmount;
  bill.discountPercent = grossAmount > 0 ? Math.round((discountAmount / grossAmount) * 10000) / 100 : 0;
  bill.amount = amount;
  bill.outstanding = Math.max(0, Math.round((amount - paidAmount) * 100) / 100);
  await bill.save();
  changed += 1;
}

console.log(JSON.stringify({ found: bills.length, changed, runPercent }));
await mongoose.disconnect();
