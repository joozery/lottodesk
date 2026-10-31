"use client";

import { useState } from "react";
import { ImageDown, Info, Printer, Send } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { copyText, downloadBlob, lineTextShareUrl, printImage } from "@/lib/bill-image";
import { formatNumber } from "@/lib/format";
import { layoffText, renderLayoffImage, shareLayoffImage } from "@/lib/layoff-image";
import { BET_LABEL } from "@/lib/prize-calc";
import type { LayoffSheet, Period } from "@/lib/types";

/** แผ่นตีออก: ดูรายการ + แชร์ LINE / ดาวน์โหลดภาพ / พิมพ์ / คัดลอกข้อความ */
export function LayoffSheetDialog({ sheet, period, onClose }: { sheet: LayoffSheet | null; period: Period | undefined; onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(kind: "line" | "download" | "print" | "copy") {
    if (!sheet) return;
    const text = layoffText(sheet, period);
    setBusy(kind);
    setNote(null);
    try {
      if (kind === "copy") { setNote((await copyText(text)) ? "คัดลอกข้อความแล้ว วางส่งได้เลย" : "คัดลอกไม่ได้ในเบราว์เซอร์นี้"); return; }
      const blob = await renderLayoffImage(sheet, period);
      if (kind === "download") { downloadBlob(blob, `${sheet.no}.png`); setNote(`บันทึกภาพ ${sheet.no}.png แล้ว`); }
      else if (kind === "print") printImage(blob);
      else {
        const outcome = await shareLayoffImage(sheet, blob, text);
        if (outcome === "shared") setNote("เปิดหน้าต่างแชร์แล้ว เลือก LINE เพื่อส่งแผ่นตีออก");
        if (outcome === "fallback") {
          window.open(lineTextShareUrl(text), "_blank", "noopener,noreferrer");
          setNote("เครื่องนี้แชร์ภาพโดยตรงไม่ได้ จึงบันทึกภาพไว้ให้และเปิด LINE พร้อมข้อความสรุป ส่งภาพที่บันทึกไว้แนบเพิ่มได้");
        }
      }
    } catch {
      setNote("สร้างแผ่นตีออกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(null);
    }
  }

  const lines = sheet ? [...sheet.lines].sort((a, b) => a.type.localeCompare(b.type) || a.number.localeCompare(b.number)) : [];
  return (
    <Dialog open={sheet !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {sheet && (
          <>
            <DialogTitle>แผ่นตีออก {sheet.no}</DialogTitle>
            <DialogDescription>ตีออกให้ {sheet.target || "-"} · {formatNumber(sheet.lines.length)} รายการ · รวม {formatNumber(sheet.total)} บาท{sheet.note ? ` · ${sheet.note}` : ""}</DialogDescription>
            <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  {lines.map((l) => (
                    <tr key={`${l.type}:${l.number}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-1.5 text-slate-600">{BET_LABEL[l.type]}</td>
                      <td className="px-3 py-1.5 text-center font-bold tabular-nums">{l.number}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-2">
              <Button className="w-full bg-[#06C755] text-white hover:bg-[#05b34c]" onClick={() => void run("line")} disabled={busy !== null}><Send /> {busy === "line" ? "กำลังสร้างภาพ..." : "ส่งต่อทาง LINE"}</Button>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => void run("download")} disabled={busy !== null}><ImageDown /> ภาพ</Button>
                <Button variant="outline" onClick={() => void run("print")} disabled={busy !== null}><Printer /> พิมพ์</Button>
                <Button variant="outline" onClick={() => void run("copy")} disabled={busy !== null}>คัดลอก</Button>
              </div>
              {note && <p role="status" className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><Info className="mt-0.5 size-4 shrink-0" /> {note}</p>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
