"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BillView } from "@/lib/bills";
import type { DiscountConfig } from "@/lib/discount";
import { formatNumber } from "@/lib/format";
import { updateBillDiscount } from "@/services/dealers-service";

export function GroupedBillDiscountEditor({ rows, discountConfig, onSaved }: { rows: BillView[]; discountConfig: DiscountConfig; onSaved?: () => void }) {
  const numberGross = rows.reduce((sum, row) => sum + row.bill.lines.filter((line) => line.type !== "runTop" && line.type !== "runBottom").reduce((lineSum, line) => lineSum + line.amount, 0), 0);
  const calculatedNumber = numberGross > 0 ? rows.reduce((sum, row) => {
    const billNumberGross = row.bill.lines.filter((line) => line.type !== "runTop" && line.type !== "runBottom").reduce((lineSum, line) => lineSum + line.amount, 0);
    return sum + billNumberGross * (row.bill.specialNumberDiscountPercent ?? row.bill.discountPercent ?? 0);
  }, 0) / numberGross : 0;
  const currentNumber = rows.length && rows.every((row) => row.bill.specialNumberDiscountPercent !== undefined && row.bill.specialNumberDiscountPercent === rows[0].bill.specialNumberDiscountPercent)
    ? rows[0].bill.specialNumberDiscountPercent
    : calculatedNumber;
  const options = [...new Set([discountConfig.defaults.number, ...discountConfig.tiers.map((tier) => tier.percent), currentNumber])].filter((percent): percent is number => typeof percent === "number").sort((a, b) => a - b);
  const currentRun: number = rows.length > 0 && rows.every((row) => row.bill.specialRunDiscountPercent !== undefined && row.bill.specialRunDiscountPercent === rows[0].bill.specialRunDiscountPercent)
    ? rows[0].bill.specialRunDiscountPercent ?? 0
    : rows.reduce((sum, row) => sum + (row.bill.specialRunDiscountPercent ?? row.bill.discountPercent ?? 0), 0) / Math.max(rows.length, 1);
  const [value, setValue] = useState(currentNumber === undefined ? "" : String(currentNumber));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function save() {
    const percent = Number(value);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setNotice("ส่วนลดกลุ่มเลขต้องอยู่ระหว่าง 0–100%");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      await Promise.all(rows.map((row) => updateBillDiscount(row.bill.id, percent, currentRun)));
      setNotice("บันทึกส่วนลดกลุ่มเลขของสรุปลูกค้าหลักแล้ว");
      onSaved?.();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "บันทึกส่วนลดกลุ่มเลขไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><h3 className="font-semibold text-amber-900">ปรับส่วนลดกลุ่มเลข</h3><p className="mt-1 text-xs text-amber-800">ปรับเฉพาะ 3 ตัวและ 2 ตัวของสรุปลูกค้าหลักนี้ ส่วนลดกลุ่มวิ่งจะคงเดิม</p><div className="mt-2 flex items-end gap-2"><label className="flex-1 text-xs font-medium text-slate-700">ส่วนลดกลุ่มเลข (%)<select value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2"><option value="">เลือกเปอร์เซ็นต์</option>{options.map((percent) => <option key={percent} value={percent}>{formatNumber(percent)}%</option>)}</select></label><Button variant="outline" size="sm" onClick={() => void save()} disabled={saving}>{saving ? "กำลังบันทึก" : "บันทึกส่วนลด"}</Button></div><p className="mt-1 text-xs text-slate-500">ส่วนลดกลุ่มวิ่งปัจจุบัน {formatNumber(currentRun)}%</p>{notice && <p className="mt-2 rounded bg-white px-2 py-1 text-xs text-blue-700">{notice}</p>}</section>;
}
