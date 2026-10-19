import mongoose from "mongoose";
import type { Config } from "./config";

let pending: Promise<unknown> | null = null;

/** เชื่อม MongoDB แบบใช้ซ้ำ (เรียกกี่ครั้งก็เชื่อมครั้งเดียว) — ใช้กับ serverless ที่ instance เดิมรับหลาย request */
export function connectDb(config: Config) {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  pending ??= mongoose
    .connect(config.MONGODB_URI, { dbName: config.MONGODB_DB, serverSelectionTimeoutMS: 8000 })
    .catch((e) => { pending = null; throw e; });
  return pending;
}
