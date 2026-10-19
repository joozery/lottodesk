"use client";

import { useState, type FormEvent } from "react";
import { Info } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { createUser, updateUser, type AdminUser } from "@/services/users-service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = เพิ่มผู้ใช้ใหม่ */
  user: AdminUser | null;
  /** ผู้ใช้ที่กำลังแก้คือตัวเอง (ห้ามลดสิทธิ์/ปิดบัญชีตัวเอง) */
  isSelf: boolean;
  onSaved: () => void;
}

function Form({ user, isSelf, onOpenChange, onSaved }: Omit<Props, "open">) {
  const editing = user !== null;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>(user?.role ?? "staff");
  const [perms, setPerms] = useState<ReadonlySet<Permission>>(new Set(user?.permissions ?? []));
  const [active, setActive] = useState(user?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = role === "admin";
  const toggle = (key: Permission) =>
    setPerms((s) => {
      const next = new Set(s);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "กรุณากรอกชื่อ";
    if (!editing && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "อีเมลไม่ถูกต้อง";
    if ((!editing || password) && password.length < 8) next.password = "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setFailure(null);
    const permissions = isAdmin ? PERMISSIONS.map((p) => p.key) : PERMISSIONS.map((p) => p.key).filter((k) => perms.has(k));
    try {
      if (user) await updateUser(user.id, { name: name.trim(), role, permissions, active, ...(password ? { password } : {}) });
      else await createUser({ name: name.trim(), email: email.trim(), password, role, permissions });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
      <div>
        <DialogTitle>{editing ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้"}</DialogTitle>
        <DialogDescription>{editing ? user.email : "กำหนดบัญชีและสิทธิ์เข้าถึงหน้าต่างๆ"}</DialogDescription>
      </div>

      <Field label="ชื่อที่แสดง" error={errors.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      {!editing && (
        <Field label="อีเมล (ใช้เข้าสู่ระบบ)" error={errors.email}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
      )}
      <Field label={editing ? "รหัสผ่านใหม่" : "รหัสผ่าน"} hint={editing ? "เว้นว่างเพื่อไม่เปลี่ยนรหัสผ่าน" : "อย่างน้อย 8 ตัวอักษร"} error={errors.password}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </Field>

      <Field label="บทบาท">
        <Select value={role} onValueChange={(v) => setRole(v as AdminUser["role"])} disabled={isSelf}>
          <SelectTrigger />
          <SelectContent>
            <SelectItem value="admin">ผู้ดูแลระบบ (ทุกสิทธิ์ และจัดการผู้ใช้ได้)</SelectItem>
            <SelectItem value="staff">เจ้าหน้าที่ (กำหนดสิทธิ์เอง)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">สิทธิ์เข้าถึงหน้า</legend>
        <div className="grid grid-cols-2 gap-2">
          {PERMISSIONS.map((p) => (
            <label key={p.key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 has-[:disabled]:opacity-60">
              <input
                type="checkbox"
                className="size-4 accent-blue-600"
                checked={isAdmin || perms.has(p.key)}
                disabled={isAdmin}
                onChange={() => toggle(p.key)}
              />
              {p.label}
            </label>
          ))}
        </div>
        {isAdmin && <p className="mt-1.5 text-xs text-slate-500">ผู้ดูแลระบบเข้าถึงได้ทุกหน้า</p>}
      </fieldset>

      {editing && (
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700">
          เปิดใช้งานบัญชี
          <Switch checked={active} onCheckedChange={setActive} disabled={isSelf} aria-label="เปิดใช้งานบัญชี" />
        </label>
      )}

      {failure && (
        <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{failure}</span>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <DialogClose asChild><Button type="button" variant="outline">ยกเลิก</Button></DialogClose>
        <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
      </div>
    </form>
  );
}

export function UserDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* mount เฉพาะตอนเปิด เพื่อรีเซ็ตค่าฟอร์มทุกครั้ง */}
      <DialogContent>{open && <Form {...rest} onOpenChange={onOpenChange} />}</DialogContent>
    </Dialog>
  );
}
