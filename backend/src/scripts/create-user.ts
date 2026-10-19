// สร้างหรืออัปเดตผู้ใช้ผู้ดูแล:  npm run create-user
// รหัสผ่านพิมพ์ตอนถาม (ไม่แสดงบนจอ ไม่ติดใน shell history); หรือตั้ง NEW_USER_EMAIL / NEW_USER_NAME / NEW_USER_PASSWORD ใน environment (ใช้ในสคริปต์อัตโนมัติ)
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { loadConfig } from "../config";
import { User } from "../models";

let muted = false;
const output = new Writable({ write(chunk, _enc, cb) { if (!muted) process.stdout.write(chunk); cb(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });

const email = (process.env.NEW_USER_EMAIL ?? (await rl.question("อีเมล: "))).trim().toLowerCase();
const name = (process.env.NEW_USER_NAME ?? (await rl.question("ชื่อที่แสดง: "))).trim();
let password = process.env.NEW_USER_PASSWORD ?? "";
if (!password) {
  process.stdout.write("รหัสผ่าน (อย่างน้อย 8 ตัว): ");
  muted = true;
  password = await rl.question("");
  muted = false;
  process.stdout.write("\n");
}
rl.close();

if (!/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 8) {
  console.error("ข้อมูลไม่ถูกต้อง: ต้องมีอีเมลที่ถูกต้อง ชื่อ และรหัสผ่านอย่างน้อย 8 ตัว");
  process.exit(1);
}

const config = loadConfig();
await mongoose.connect(config.MONGODB_URI, { dbName: config.MONGODB_DB, serverSelectionTimeoutMS: 8000 });
const passwordHash = await bcrypt.hash(password, 12);
const existing = await User.findOneAndUpdate({ email }, { name, passwordHash }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
console.log(`บันทึกผู้ใช้ ${existing.email} แล้ว`);
await mongoose.disconnect();
