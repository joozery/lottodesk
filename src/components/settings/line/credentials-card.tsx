"use client";

import { useState } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { LineErrors, LineSettings } from "@/lib/line-settings";
import { LineCard } from "./line-card";

function SecretInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="pr-11 font-mono"
        aria-label={label}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 size-8"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "ซ่อนค่า" : "แสดงค่า"}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

interface Props {
  values: LineSettings;
  errors: LineErrors;
  set: <K extends keyof LineSettings>(key: K, value: LineSettings[K]) => void;
}

export function CredentialsCard({ values, errors, set }: Props) {
  return (
    <LineCard step="01" title="ข้อมูลเชื่อมต่อ Messaging API" description="คัดลอกข้อมูลจาก Channel ของคุณใน LINE Developers Console">
      <Field label="Channel ID" error={errors.channelId} hint="แท็บ Basic settings">
        <Input inputMode="numeric" value={values.channelId} onChange={(e) => set("channelId", e.target.value)} autoComplete="off" className="font-mono" />
      </Field>
      <Field label="Channel secret" error={errors.channelSecret} hint="แท็บ Basic settings — ใช้ตรวจลายเซ็นของ Webhook">
        <SecretInput label="Channel secret" value={values.channelSecret} onChange={(v) => set("channelSecret", v)} />
      </Field>
      <Field label="Channel access token (long-lived)" error={errors.channelAccessToken} hint="แท็บ Messaging API — ใช้ส่งข้อความออก">
        <SecretInput label="Channel access token" value={values.channelAccessToken} onChange={(v) => set("channelAccessToken", v)} />
      </Field>
    </LineCard>
  );
}
