import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { Config } from "../config.js";
import { COOKIE, signToken, requireAuth, toAuthUser } from "../middleware/auth.js";
import { HttpError, parse } from "../middleware/http.js";
import { User } from "../models.js";

const loginBody = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1) });

// hash ปลอมไว้เทียบเมื่อไม่พบอีเมล เพื่อให้เวลาตอบใกล้เคียงกัน (กันเดาว่าอีเมลมีในระบบ)
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export function authRouter(config: Config) {
  const r = Router();
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: config.COOKIE_SECURE, maxAge: 7 * 24 * 3600 * 1000, path: "/" };

  r.post("/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
    const { email, password } = parse(loginBody, req.body);
    const user = await User.findOne({ email }).lean();
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    if (user.active === false) throw new HttpError(403, "บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
    const me = toAuthUser(user);
    res.cookie(COOKIE, signToken(me, config.JWT_SECRET), cookieOpts).json(me);
  });

  r.post("/logout", (_req, res) => {
    res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined }).status(204).end();
  });

  r.get("/me", requireAuth(config.JWT_SECRET), (req, res) => {
    res.json(req.user);
  });

  return r;
}
