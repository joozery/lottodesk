import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { HttpError, parse } from "../middleware/http.js";
import { User } from "../models.js";
import { PERMISSION_KEYS } from "../permissions.js";

const permissions = z.array(z.enum(PERMISSION_KEYS));
const password = z.string().min(8, "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว").max(200);
const createBody = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  email: z.string().trim().toLowerCase().regex(/^\S+@\S+\.\S+$/, "อีเมลไม่ถูกต้อง"),
  password,
  role: z.enum(["admin", "staff"]),
  permissions: permissions.default([]),
});
const updateBody = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  role: z.enum(["admin", "staff"]),
  permissions,
  active: z.boolean(),
  password: password.optional(),
}).partial();

const pubUser = (u: { _id: string; name: string; email: string; role?: string | null; permissions?: string[] | null; active?: boolean | null; createdAt?: Date }) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role ?? "admin",
  permissions: u.permissions ?? [],
  active: u.active !== false,
  createdAt: u.createdAt?.toISOString() ?? null,
});

/** ต้องเหลือผู้ดูแลที่ใช้งานได้อย่างน้อยหนึ่งคนเสมอ */
async function otherActiveAdmins(exceptId: string) {
  return User.countDocuments({ _id: { $ne: exceptId }, role: { $ne: "staff" }, active: { $ne: false } });
}

export function usersRouter() {
  const r = Router();

  r.get("/", async (_req, res) => {
    res.json((await User.find().sort({ createdAt: 1 }).lean()).map(pubUser));
  });

  r.post("/", async (req, res) => {
    const b = parse(createBody, req.body);
    if (await User.exists({ email: b.email })) throw new HttpError(409, "อีเมลนี้มีผู้ใช้แล้ว");
    const user = await User.create({ name: b.name, email: b.email, role: b.role, permissions: b.permissions, passwordHash: await bcrypt.hash(b.password, 12) });
    res.status(201).json(pubUser(user.toObject()));
  });

  r.patch("/:id", async (req, res) => {
    const b = parse(updateBody, req.body);
    const id = String(req.params.id);
    const target = await User.findById(id).lean();
    if (!target) throw new HttpError(404, "ไม่พบผู้ใช้");
    const isSelf = id === req.user!.id;
    if (isSelf && (b.role === "staff" || b.active === false)) throw new HttpError(400, "ไม่สามารถลดสิทธิ์หรือปิดบัญชีของตัวเองได้");
    const wasAdmin = (target.role ?? "admin") === "admin" && target.active !== false;
    const stillAdmin = (b.role ?? target.role ?? "admin") === "admin" && (b.active ?? target.active) !== false;
    if (wasAdmin && !stillAdmin && (await otherActiveAdmins(id)) === 0) throw new HttpError(400, "ต้องเหลือผู้ดูแลระบบอย่างน้อย 1 คน");

    const { password: newPassword, ...rest } = b;
    const update = { ...rest, ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 12) } : {}) };
    const user = await User.findByIdAndUpdate(id, update, { returnDocument: "after" }).lean();
    res.json(pubUser(user!));
  });

  r.delete("/:id", async (req, res) => {
    const id = String(req.params.id);
    if (id === req.user!.id) throw new HttpError(400, "ไม่สามารถลบบัญชีของตัวเองได้");
    const target = await User.findById(id).lean();
    if (!target) throw new HttpError(404, "ไม่พบผู้ใช้");
    if ((target.role ?? "admin") === "admin" && target.active !== false && (await otherActiveAdmins(id)) === 0) throw new HttpError(400, "ต้องเหลือผู้ดูแลระบบอย่างน้อย 1 คน");
    await User.deleteOne({ _id: id });
    res.status(204).end();
  });

  return r;
}
