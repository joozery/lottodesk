"use client";

import { useState } from "react";
import { Copy } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineCard } from "./line-card";

const STEPS = [
  "สร้าง Provider และ Channel แบบ Messaging API ใน LINE Developers Console",
  "คัดลอก Channel ID, Channel secret และออก Channel access token มากรอกในส่วนข้อมูลเชื่อมต่อ",
  "วาง Webhook URL นี้ในแท็บ Messaging API แล้วเปิด “Use webhook”",
  "เพิ่มบอทเป็นเพื่อน หรือเชิญเข้ากลุ่ม แล้วนำ User ID / Group ID มากรอกเป็นผู้รับ",
];

export function WebhookCard() {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/api/line/webhook`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard ใช้ไม่ได้ (เช่นไม่ใช่ HTTPS) — ผู้ใช้เลือกคัดลอกจากช่องได้เอง
    }
  }

  return (
    <LineCard step="02" title="Webhook และขั้นตอนการตั้งค่า" description="นำ URL ไปตั้งค่าใน LINE Developers Console">
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Webhook URL</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={url} className="min-w-0 bg-slate-50 font-mono text-xs" aria-label="Webhook URL" onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" variant="outline" onClick={copy}>
            <Copy /> {copied ? "คัดลอกแล้ว" : "คัดลอก"}
          </Button>
        </div>
        <p className="mt-2 text-xs leading-5 text-amber-700">
          LINE ต้องเรียก URL แบบ HTTPS ที่เข้าถึงได้จากอินเทอร์เน็ต และ endpoint นี้ยังไม่ได้พัฒนา
        </p>
      </div>
      <ol className="flex flex-col gap-3 border-t border-slate-100 pt-4">
        {STEPS.map((text, i) => (
          <li key={text} className="flex gap-3 text-sm text-slate-700">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{i + 1}</span>
            <span className="pt-0.5">{text}</span>
          </li>
        ))}
      </ol>
    </LineCard>
  );
}
