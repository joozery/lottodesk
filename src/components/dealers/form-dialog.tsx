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
  children: (values: Values, set: (key: string, value: string) => void, errors: Errors) => ReactNode;
}

/**
 * ฟอร์มสำหรับข้อมูลตัวอย่าง: ตรวจสอบข้อมูลแล้วแจ้งชัดเจนว่า "ยังไม่ได้บันทึก"
 * เมื่อเชื่อมต่อ API จริง ให้เปลี่ยน onSubmit ให้เรียก service และแสดงว่าสำเร็จเมื่อบันทึกจริงเท่านั้น
 */
function FormBody({ title, description, init, validate, children }: Omit<FormDialogProps, "open" | "onOpenChange">) {
  const [values, setValues] = useState<Values>(init);
  const [errors, setErrors] = useState<Errors>({});
  const [checked, setChecked] = useState(false);

  const set = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setChecked(false);
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validate(values);
    setErrors(next);
    setChecked(Object.keys(next).length === 0);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </div>
      {children(values, set, errors)}
      <div role="status" className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          {checked
            ? "ข้อมูลผ่านการตรวจสอบแล้ว แต่ยังไม่ได้บันทึก เพราะหน้านี้ใช้ข้อมูลตัวอย่างและยังไม่ได้เชื่อมต่อ API"
            : "หน้านี้ใช้ข้อมูลตัวอย่าง ข้อมูลที่กรอกจะไม่ถูกบันทึกลงระบบ"}
        </span>
      </div>
      <div className="flex justify-end gap-2">
        <DialogClose asChild><Button type="button" variant="outline">ปิด</Button></DialogClose>
        <Button type="submit">ตรวจสอบข้อมูล</Button>
      </div>
    </form>
  );
}

export function FormDialog({ open, onOpenChange, ...body }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* mount เฉพาะตอนเปิด เพื่อรีเซ็ตค่าฟอร์มทุกครั้ง */}
      <DialogContent>{open && <FormBody {...body} />}</DialogContent>
    </Dialog>
  );
}
