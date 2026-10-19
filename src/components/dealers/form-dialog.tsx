"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Info } from "@/components/icons";
import { Button } from "@/components/ui/button";
export { Field } from "@/components/ui/field";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type Values = Record<string, string>;
export type Errors = Record<string, string>;

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  init: Values;
  /** คืนข้อความ error ต่อฟิลด์; object ว่าง = ผ่านการตรวจสอบ */
  validate: (values: Values) => Errors;
  /** บันทึกจริง; throw = แสดงข้อความ error และไม่ปิดฟอร์ม */
  onSubmit: (values: Values) => Promise<void>;
  children: (values: Values, set: (key: string, value: string) => void, errors: Errors) => ReactNode;
}

function FormBody({ title, description, init, validate, onSubmit, onOpenChange, children }: Omit<FormDialogProps, "open">) {
  const [values, setValues] = useState<Values>(init);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const set = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setFailure(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setFailure(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
      <div>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </div>
      {children(values, set, errors)}
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

export function FormDialog({ open, onOpenChange, ...body }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* mount เฉพาะตอนเปิด เพื่อรีเซ็ตค่าฟอร์มทุกครั้ง */}
      <DialogContent>{open && <FormBody {...body} onOpenChange={onOpenChange} />}</DialogContent>
    </Dialog>
  );
}
