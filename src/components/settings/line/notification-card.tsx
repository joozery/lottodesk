"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  NOTIFY_OPTIONS, TEMPLATE_VARIABLES, renderTemplate,
  type LineErrors, type LineSettings,
} from "@/lib/line-settings";
import { LineCard } from "./line-card";

interface Props {
  values: LineSettings;
  errors: LineErrors;
  set: <K extends keyof LineSettings>(key: K, value: LineSettings[K]) => void;
}

export function NotificationCard({ values, errors, set }: Props) {
  return (
    <LineCard step="03" title="การแจ้งเตือน" description="กำหนดผู้รับและเลือกเหตุการณ์ที่ต้องการส่งเข้า LINE">
      <Field label="ผู้รับ (User ID หรือ Group ID)" error={errors.recipientId} hint="User ID ขึ้นต้นด้วย U, Group ID ขึ้นต้นด้วย C">
        <Input value={values.recipientId} onChange={(e) => set("recipientId", e.target.value)} autoComplete="off" spellCheck={false} className="font-mono" placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
      </Field>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        {NOTIFY_OPTIONS.map((o) => (
          <li key={o.key} className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-slate-50/70">
            <div>
              <p id={`notify-${o.key}`} className="text-sm font-medium text-slate-800">{o.label}</p>
              <p className="text-xs text-slate-500">{o.hint}</p>
            </div>
            <Switch
              aria-labelledby={`notify-${o.key}`}
              checked={values.notify[o.key]}
              onCheckedChange={(checked) => set("notify", { ...values.notify, [o.key]: checked })}
            />
          </li>
        ))}
      </ul>

      <Field label="แม่แบบข้อความเตือนยอดค้างชำระ" error={errors.reminderTemplate}>
        <Textarea value={values.reminderTemplate} onChange={(e) => set("reminderTemplate", e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        ตัวแปร:
        {TEMPLATE_VARIABLES.map((v) => (
          <code key={v} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{v}</code>
        ))}
        <span className="ml-auto tabular-nums">{values.reminderTemplate.length}/500</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <p className="mb-1.5 text-xs font-medium text-slate-500">ตัวอย่างข้อความที่ผู้รับจะเห็น</p>
        <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm">
          {renderTemplate(values.reminderTemplate) || <span className="text-slate-400">ยังไม่มีข้อความ</span>}
        </div>
      </div>
    </LineCard>
  );
}
