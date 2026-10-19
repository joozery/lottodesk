"use client";

import { useState, type FormEvent } from "react";
import { Info } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDate, lotteryLabel } from "@/lib/format";
import { PRIZE_SPEC, type PrizeResult } from "@/lib/prize";
import type { Period } from "@/lib/types";
import { savePrizeResult } from "@/services/results-service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: Period;
  /** ผลที่มีอยู่แล้ว (โหมดแก้ไข) */
  existing: PrizeResult | null;
  onSaved: () => void;
}

export function PrizeResultDialog({ open, onOpenChange, ...body }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* mount เฉพาะตอนเปิด เพื่อให้ฟอร์มเริ่มจากค่าล่าสุดทุกครั้ง */}
      <DialogContent>{open && <PrizeResultForm onClose={() => onOpenChange(false)} {...body} />}</DialogContent>
    </Dialog>
  );
}

function PrizeResultForm({ period, existing, onSaved, onClose }: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }) {
  const spec = PRIZE_SPEC[period.lottery];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      spec.flatMap((s) =>
        Array.from({ length: s.count }, (_, i) => [`${s.key}-${i}`, existing?.groups.find((g) => g.key === s.key)?.numbers[i] ?? ""]),
      ),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const s of spec) {
      for (let i = 0; i < s.count; i++) {
        const key = `${s.key}-${i}`;
        if (!new RegExp(`^\\d{${s.digits}}$`).test(values[key])) next[key] = `กรอกตัวเลข ${s.digits} หลัก`;
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setFailed(false);
    try {
      const { persisted } = await savePrizeResult({
        periodId: period.id,
        announcedAt: new Date().toISOString(),
        confirmedBy: "ผู้ดูแลระบบ",
        groups: spec.map((s) => ({
          key: s.key,
          label: s.label,
          numbers: Array.from({ length: s.count }, (_, i) => values[`${s.key}-${i}`]),
        })),
      });
      if (persisted) {
        onSaved();
        onClose();
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <DialogTitle>{existing ? "แก้ไขผลรางวัล" : "บันทึกผลรางวัล"}</DialogTitle>
        <DialogDescription>
          {lotteryLabel[period.lottery]} งวด {formatDate(period.drawDate)}
        </DialogDescription>
      </div>

      {existing && (
        <div role="status" className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <Info className="mt-0.5 size-4 shrink-0" />
          การแก้ไขจะคำนวณเงินรางวัลของทุกบิลในงวดนี้ใหม่ตามเลขที่กรอก
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {spec.flatMap((s) =>
          Array.from({ length: s.count }, (_, i) => {
            const key = `${s.key}-${i}`;
            return (
              <div key={key} className={s.primary ? "sm:col-span-2" : undefined}>
                <Field label={s.count > 1 ? `${s.label} (${i + 1})` : s.label} error={errors[key]}>
                  <Input
                    inputMode="numeric"
                    maxLength={s.digits}
                    value={values[key]}
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value.replace(/\D/g, "") }))}
                    placeholder={"0".repeat(s.digits)}
                    className="font-mono tracking-widest"
                    autoFocus={key === `${spec[0].key}-0`}
                  />
                </Field>
              </div>
            );
          }),
        )}
      </div>

      <div role="status" className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0" />
        ผลรางวัลจะถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น ยังไม่ซิงก์กับเครื่องอื่นหรือระบบกลาง
      </div>
      {failed && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          บันทึกไม่สำเร็จ เบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูล (เช่น โหมดส่วนตัว) กรุณาลองใหม่
        </p>
      )}

      <div className="flex justify-end gap-2">
        <DialogClose asChild><Button type="button" variant="outline">ยกเลิก</Button></DialogClose>
        <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกและยืนยันผล"}</Button>
      </div>
    </form>
  );
}
