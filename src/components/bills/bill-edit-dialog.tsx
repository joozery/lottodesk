"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { BetLine, Bill } from "@/lib/types";
import { updateBillLines } from "@/services/dealers-service";

const digits: Record<BetLine["type"], number> = { top3: 3, tod3: 3, bottom3: 3, top2: 2, bottom2: 2, runTop: 1, runBottom: 1 };
type Field = "top" | "tod" | "bottom";
type EditRow = { number: string; fields: Partial<Record<Field, { index: number; type: BetLine["type"]; amount: number }>> };

function rowsFromLines(lines: BetLine[]): EditRow[] {
  const rows = new Map<string, EditRow>();
  for (const [index, line] of lines.entries()) {
    const row = rows.get(line.number) ?? { number: line.number, fields: {} };
    const field: Field = line.type === "tod3" ? "tod" : line.type === "bottom3" || line.type === "bottom2" || line.type === "runBottom" ? "bottom" : "top";
    row.fields[field] = { index, type: line.type, amount: line.amount };
    rows.set(line.number, row);
  }
  return [...rows.values()];
}

export function BillEditDialog({ bill, open, onOpenChange, onSaved }: { bill: Bill; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [lines, setLines] = useState<BetLine[]>(bill.lines.map((line) => ({ ...line })));
  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const rows = rowsFromLines(lines);

  function changeLine(index: number, key: "number" | "amount", value: string) {
    setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: key === "amount" ? Number(value) : value } : line));
  }

  function typeForField(number: string, field: Field): BetLine["type"] {
    if (number.length === 1) return field === "bottom" ? "runBottom" : "runTop";
    if (number.length === 2) return field === "bottom" ? "bottom2" : "top2";
    return field === "tod" ? "tod3" : field === "bottom" ? "bottom3" : "top3";
  }

  function changeField(row: EditRow, field: Field, value: string) {
    const item = row.fields[field];
    if (item) {
      if (!value) {
        setLines((current) => current.filter((_, index) => index !== item.index));
        return;
      }
      changeLine(item.index, "amount", value);
      return;
    }
    setDraftAmounts((current) => ({ ...current, [`${row.number}:${field}`]: value }));
  }

  function commitDraft(row: EditRow, field: Field) {
    const key = `${row.number}:${field}`;
    const amount = Number(draftAmounts[key]);
    if (!draftAmounts[key] || !Number.isFinite(amount) || amount <= 0) return;
    setLines((current) => [...current, { type: typeForField(row.number, field), number: row.number, amount }]);
    setDraftAmounts((current) => { const next = { ...current }; delete next[key]; return next; });
  }

  function changeNumber(row: EditRow, value: string) {
    const indexes = new Set(Object.values(row.fields).filter(Boolean).map((field) => field!.index));
    setLines((current) => current.map((line, index) => {
      if (!indexes.has(index)) return line;
      const field = (Object.entries(row.fields).find(([, item]) => item?.index === index)?.[0] ?? "top") as Field;
      return { ...line, number: value, type: typeForField(value, field) };
    }));
  }

  function removeRow(row: EditRow) {
    const indexes = new Set(Object.values(row.fields).filter(Boolean).map((field) => field!.index));
    setLines((current) => current.filter((_, index) => !indexes.has(index)));
  }

  function addRow() {
    if (rows.some((row) => row.number === "")) return;
    setLines((current) => [...current, { type: "top3", number: "", amount: 0 }]);
  }

  async function save() {
    const pendingLines = Object.entries(draftAmounts).reduce<BetLine[]>((current, [key, value]) => {
      const separator = key.lastIndexOf(":");
      const number = key.slice(0, separator);
      const field = key.slice(separator + 1) as Field;
      const amount = Number(value);
      return Number.isFinite(amount) && amount > 0 ? [...current, { type: typeForField(number, field), number, amount }] : current;
    }, []);
    const linesToSave = [...lines, ...pendingLines];
    if (!linesToSave.length || linesToSave.some((line) => !new RegExp(`^\\d{${digits[line.type]}}$`).test(line.number) || !Number.isFinite(line.amount) || line.amount <= 0)) {
      setNotice("กรุณาตรวจสอบเลขและยอดให้ถูกต้อง");
      return;
    }
    setSaving(true);
    try {
      await updateBillLines(bill.id, linesToSave);
      onOpenChange(false);
      onSaved();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "แก้ไขบิลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogTitle>แก้ไขเลขและยอดแทง</DialogTitle>
      <DialogDescription>จัดรูปแบบเหมือนหน้าคีย์เลข · แก้ได้เฉพาะบิลที่ยังไม่มีการรับเงิน</DialogDescription>
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <div className="grid min-w-[560px] grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"><span>เลข</span><span className="text-right">บน</span><span className="text-right">โต๊ด</span><span className="text-right">ล่าง</span><span /></div>
        <div className="min-w-[560px] divide-y divide-slate-100">
          {rows.map((row, rowIndex) => <div key={`edit-row-${rowIndex}`} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] items-center gap-2 px-3 py-2">
            <Input value={row.number} maxLength={3} inputMode="numeric" onChange={(event) => changeNumber(row, event.target.value.replace(/\D/g, ""))} aria-label="เลข" />
            {(["top", "tod", "bottom"] as const).map((field) => {
              const item = row.fields[field];
              if (field === "tod" && row.number.length !== 3) return <span key={field} className="text-center text-slate-300">-</span>;
              const draftKey = `${row.number}:${field}`;
              return <Input key={field} type="number" min="0.01" step="0.01" value={item && item.amount > 0 ? item.amount : draftAmounts[draftKey] ?? ""} placeholder="-" onChange={(event) => changeField(row, field, event.target.value)} onBlur={() => !item && commitDraft(row, field)} className="text-right" aria-label={field} />;
            })}
            <Button type="button" variant="outline" size="sm" onClick={() => removeRow(row)}>ลบ</Button>
          </div>)}
        </div>
      </div>
      <Button type="button" variant="outline" onClick={addRow} disabled={rows.some((row) => row.number === "")}>+ เพิ่มแถว</Button>
      {!rows.length && <p className="mt-3 text-sm text-amber-700">ต้องมีอย่างน้อย 1 รายการ</p>}
      {notice && <p className="mt-3 rounded bg-amber-50 px-2 py-1.5 text-sm text-amber-800">{notice}</p>}
      <div className="mt-5 flex justify-end gap-2"><DialogClose asChild><Button type="button" variant="outline">ยกเลิก</Button></DialogClose><Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</Button></div>
    </DialogContent>
  </Dialog>;
}
