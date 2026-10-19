"use client";

import { useState } from "react";
import { Send } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { validateTestTarget, type LineSettings } from "@/lib/line-settings";
import { sendLineTestMessage } from "@/services/line-service";
import { LineCard, ResultNotice } from "./line-card";

type Outcome = { tone: "success" | "warning" | "error"; text: string } | null;

export function TestMessageCard({ values }: { values: LineSettings }) {
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function send() {
    const missing = validateTestTarget(values);
    if (Object.keys(missing).length > 0) {
      setOutcome({ tone: "error", text: "กรอก Channel access token และ ID ผู้รับให้ถูกต้องก่อนส่งทดสอบ" });
      return;
    }
    setSending(true);
    setOutcome(null);
    try {
      const { sent } = await sendLineTestMessage(values);
      setOutcome(
        sent
          ? { tone: "success", text: "ส่งข้อความทดสอบเข้า LINE แล้ว" }
          : { tone: "warning", text: "ยังไม่ได้ส่งจริง เพราะหน้านี้ใช้ข้อมูลตัวอย่างและยังไม่ได้เชื่อมต่อ LINE API" },
      );
    } catch {
      setOutcome({ tone: "error", text: "ส่งข้อความทดสอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSending(false);
    }
  }

  return (
    <LineCard step="04" title="ส่งข้อความทดสอบ" description="ตรวจสอบ token และผู้รับก่อนเปิดใช้งานจริง">
      <Button type="button" variant="outline" onClick={send} disabled={sending} className="self-start">
        <Send /> {sending ? "กำลังส่ง..." : "ส่งข้อความทดสอบ"}
      </Button>
      {outcome && <ResultNotice tone={outcome.tone}>{outcome.text}</ResultNotice>}
    </LineCard>
  );
}
