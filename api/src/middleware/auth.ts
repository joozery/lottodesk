import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models.js";
import { PERMISSION_KEYS, type Permission } from "../permissions.js";

export interface AuthUser { id: string; name: string; email: string; role: string; permissions: Permission[] }
export const COOKIE = "ld_token";

declare module "express-serve-static-core" {
  interface Request { user?: AuthUser }
}

export const signToken = (user: Pick<AuthUser, "id">, secret: string) => jwt.sign({ id: user.id }, secret, { expiresIn: "7d" });

/** แปลงเอกสารผู้ใช้เป็นข้อมูลที่ส่งให้หน้าเว็บ; admin ได้ทุกสิทธิ์ */
export const toAuthUser = (u: { _id: string; name: string; email: string; role?: string | null; permissions?: string[] | null }): AuthUser => {
  const role = u.role ?? "admin";
  const permissions = role === "admin" ? [...PERMISSION_KEYS] : PERMISSION_KEYS.filter((k) => u.permissions?.includes(k));
  return { id: u._id, name: u.name, email: u.email, role, permissions };
};

/** อ่านสิทธิ์จาก DB ทุกครั้ง เพื่อให้การเปลี่ยนสิทธิ์/ปิดบัญชีมีผลทันที */
export function requireAuth(secret: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
    const token: unknown = req.cookies?.[COOKIE] ?? bearer;
    if (typeof token !== "string") { res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" }); return; }
    let id: string;
    try {
      id = (jwt.verify(token, secret) as { id: string }).id;
    } catch {
      res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
      return;
    }
    const user = await User.findById(id).lean();
    if (!user || user.active === false) { res.status(401).json({ error: "บัญชีนี้ใช้งานไม่ได้" }); return; }
    req.user = toAuthUser(user);
    next();
  };
}

/** การเขียน (ไม่ใช่ GET) ต้องมีอย่างน้อยหนึ่งสิทธิ์ในรายการ — การอ่านข้อมูลอ้างอิงเปิดให้ผู้ที่ login แล้ว */
export const requireWrite = (...keys: Permission[]) => (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "GET" || keys.some((k) => req.user?.permissions.includes(k))) { next(); return; }
  res.status(403).json({ error: "คุณไม่มีสิทธิ์ทำรายการนี้" });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === "admin") { next(); return; }
  res.status(403).json({ error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
};
