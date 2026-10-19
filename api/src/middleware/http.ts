import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** ตรวจ input ด้วย zod; ไม่ผ่านให้ตอบ 400 */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new HttpError(400, r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  return r.data;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof ZodError) { res.status(400).json({ error: err.message }); return; }
  console.error(err);
  res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
}
