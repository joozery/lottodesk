const fs = require("node:fs");
const mongoose = require("mongoose");

const env = fs.readFileSync("../.env", "utf8").split(/\r?\n/).reduce((result, line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) result[match[1]] = match[2];
  return result;
}, {});

const runPercent = 8;
const Bill = mongoose.model("Bill", new mongoose.Schema({ _id: String }, { strict: false, collection: "bills" }));

async function main() {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB || "lottodesk", serverSelectionTimeoutMS: 8000 });
  const bills = await Bill.find({ $or: [{ specialRunDiscountPercent: { $exists: false } }, { specialRunDiscountPercent: { $ne: runPercent } }] }).lean();
  let changed = 0;
  for (const bill of bills) {
    const lines = bill.lines ?? [];
    const grossAmount = bill.grossAmount ?? lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const numberGross = lines.filter((line) => line.type !== "runTop" && line.type !== "runBottom").reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const runGross = grossAmount - numberGross;
    const numberPercent = bill.specialNumberDiscountPercent ?? bill.discountPercent ?? 0;
    const discountAmount = Math.round((numberGross * numberPercent + runGross * runPercent)) / 100;
    const amount = Math.round((grossAmount - discountAmount) * 100) / 100;
    const paidAmount = Math.max(0, Number(bill.amount || 0) - Number(bill.outstanding || 0));
    await Bill.updateOne({ _id: bill._id }, { $set: {
      grossAmount,
      specialDiscountPercent: numberPercent,
      specialNumberDiscountPercent: numberPercent,
      specialRunDiscountPercent: runPercent,
      discountAmount,
      discountPercent: grossAmount > 0 ? Math.round((discountAmount / grossAmount) * 10000) / 100 : 0,
      amount,
      outstanding: Math.max(0, Math.round((amount - paidAmount) * 100) / 100),
    } });
    changed += 1;
  }
  console.log(JSON.stringify({ found: bills.length, changed, runPercent }));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
