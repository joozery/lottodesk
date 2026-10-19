"use client";

import { useState } from "react";
import { ImageDown, Info, Printer, Send } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { billSummaryText, copyText, downloadBlob, FACEBOOK_URL, lineTextShareUrl, printImage, renderBillImage, shareBillImage } from "@/lib/bill-image";
import type { BillView } from "@/lib/bills";

type Busy = "line" | "facebook" | "download" | "print" | null;
type Note = { tone: "info" | "warn" | "error"; text: string; link?: { href: string; label: string; color: string } } | null;

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
      <path d="M9 8H6v4h3v12h5V12h3.6l.4-4H14V6.3c0-1 .2-1.3 1.1-1.3H18V0h-3.8C10.6 0 9 1.6 9 4.6V8z" />
    </svg>
  );
}

/** ปุ่มแชร์ภาพบิลไป LINE / Facebook, ดาวน์โหลดภาพ 1:1, พิมพ์บิล */
export function BillShareActions({ view }: { view: BillView }) {
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<Note>(null);

  async function run(kind: Exclude<Busy, null>) {
    setBusy(kind);
    setNote(null);
    try {
      const blob = await renderBillImage(view);
      if (kind === "download") {
        downloadBlob(blob, `${view.bill.no}.png`);
        setNote({ tone: "info", text: `บันทึกภาพ ${view.bill.no}.png แล้ว` });
      } else if (kind === "print") {
        printImage(blob);
      } else {
        const name = kind === "line" ? "LINE" : "Facebook";
        const outcome = await shareBillImage(view, blob);
        if (outcome === "shared") setNote({ tone: "info", text: `เปิดหน้าต่างแชร์แล้ว เลือก ${name} เพื่อส่งภาพบิล` });
        if (outcome === "fallback") {
          const text = billSummaryText(view);
          const copied = kind === "facebook" && (await copyText(text));
          setNote({
            tone: "warn",
            text:
              kind === "line"
                ? "เครื่องนี้แชร์ภาพเข้า LINE โดยตรงไม่ได้ จึงบันทึกภาพไว้ให้แล้ว เปิด LINE แล้วแนบภาพนี้ได้เลย หรือส่งข้อความสรุปแทน"
                : `เครื่องนี้แชร์ภาพเข้า Facebook โดยตรงไม่ได้ จึงบันทึกภาพไว้ให้แล้ว${copied ? " และคัดลอกข้อความสรุปไว้ในคลิปบอร์ด" : ""} เปิด Facebook แล้วแนบภาพนี้ได้เลย`,
            link:
              kind === "line"
                ? { href: lineTextShareUrl(text), label: "เปิด LINE เพื่อส่งข้อความสรุป", color: "text-[#05a041]" }
                : { href: FACEBOOK_URL, label: "เปิด Facebook", color: "text-[#1877F2]" },
          });
        }
      }
    } catch {
      setNote({ tone: "error", text: "สร้างภาพบิลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button className="bg-[#06C755] text-white hover:bg-[#05b34c]" onClick={() => run("line")} disabled={busy !== null}>
          <Send /> {busy === "line" ? "กำลังสร้างภาพ..." : "แชร์ LINE"}
        </Button>
        <Button className="bg-[#1877F2] text-white hover:bg-[#1468d6]" onClick={() => run("facebook")} disabled={busy !== null}>
          <FacebookIcon /> {busy === "facebook" ? "กำลังสร้างภาพ..." : "แชร์ Facebook"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => run("print")} disabled={busy !== null}>
          <Printer /> พิมพ์บิล
        </Button>
        <Button variant="outline" onClick={() => run("download")} disabled={busy !== null}>
          <ImageDown /> ดาวน์โหลดภาพ 1:1
        </Button>
      </div>
      {note && (
        <div
          role={note.tone === "error" ? "alert" : "status"}
          className={`flex gap-2 rounded-lg p-3 text-xs ${note.tone === "error" ? "bg-red-50 text-red-700" : note.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-600"}`}
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1.5">
            <p>{note.text}</p>
            {note.link && (
              <a href={note.link.href} target="_blank" rel="noopener noreferrer" className={`inline-block font-semibold underline ${note.link.color}`}>
                {note.link.label}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
