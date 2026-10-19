import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser { id: string; name: string; email: string; role: string }
export const COOKIE = "ld_token";

declare module "express-serve-static-core" {
  interface Request { user?: AuthUser }
}

export const signToken = (user: AuthUser, secret: string) => jwt.sign(user, secret, { expiresIn: "7d" });

export function requireAuth(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
    const token: unknown = req.cookies?.[COOKIE] ?? bearer;
    if (typeof token !== "string") { res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" }); return; }
    try {
      const p = jwt.verify(token, secret) as AuthUser;
      req.user = { id: p.id, name: p.name, email: p.email, role: p.role };
      next();
    } catch {
      res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    }
  };
}
