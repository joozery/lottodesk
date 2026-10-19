import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "ต้องตั้ง MONGODB_URI"),
  MONGODB_DB: z.string().min(1).default("lottodesk"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร"),
  CORS_ORIGIN: z.string().default("http://localhost:3001"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
});

/** อ่านและตรวจ environment — เรียกเมื่อจะใช้งานจริง เพื่อให้ไฟล์อื่น import ได้โดยไม่ต้องมี .env */
export function loadConfig() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`ค่า environment ไม่ครบ/ไม่ถูกต้อง (ดู .env.example):\n${lines.join("\n")}`);
  }
  return parsed.data;
}

export type Config = ReturnType<typeof loadConfig>;
