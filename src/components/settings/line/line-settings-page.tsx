"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Info } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useRemote } from "@/hooks/use-remote";
import { validateLineSettings, type LineErrors, type LineSettings } from "@/lib/line-settings";
import { fetchLineSettings, saveLineSettings } from "@/services/line-service";
import { CredentialsCard } from "./credentials-card";
import { ResultNotice } from "./line-card";
import { NotificationCard } from "./notification-card";
import { TestMessageCard } from "./test-message-card";
import { WebhookCard } from "./webhook-card";

export function LineSettingsPage() {
  const [nonce, setNonce] = useState(0);
  const { data, error } = useRemote(`line-settings-${nonce}`, fetchLineSettings);

  return (
    <>
      <TopBar breadcrumb={["ตั้งค่า", "LINE Messaging API"]} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28">
        <SettingsTabs current="/settings/line" />
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white shadow-sm shadow-green-100">
              <Image src="/icons/line.svg" width={32} height={32} alt="" unoptimized />
            </span>
            <div>
              <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">Integrations</p>
              <h1 className="text-2xl font-bold text-slate-900">LINE Messaging API</h1>
              <p className="mt-1 text-sm text-slate-500">ตั้งค่าการแจ้งเตือนอัตโนมัติผ่าน LINE Official Account</p>
            </div>
          </div>
          <Badge tone="orange">ข้อมูลตัวอย่าง</Badge>
        </div>

        {error ? (
          <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดการตั้งค่าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState>
        ) : !data ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        ) : (
          <LineSettingsForm initial={data} />
        )}
      </main>
    </>
  );
}

type SaveOutcome = { tone: "success" | "warning" | "error"; text: string } | null;

function LineSettingsForm({ initial }: { initial: LineSettings }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<LineErrors>({});
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<SaveOutcome>(null);

  const set = <K extends keyof LineSettings>(key: K, value: LineSettings[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setOutcome(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validateLineSettings(values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOutcome({ tone: "error", text: "ข้อมูลบางช่องไม่ถูกต้อง กรุณาตรวจสอบช่องที่มีข้อความสีแดง" });
      return;
    }
    setSaving(true);
    try {
      const { persisted } = await saveLineSettings(values);
      setOutcome(
        persisted
          ? { tone: "success", text: "บันทึกการตั้งค่าแล้ว" }
          : { tone: "warning", text: "ข้อมูลผ่านการตรวจสอบแล้ว แต่ยังไม่ได้บันทึก เพราะหน้านี้ใช้ข้อมูลตัวอย่างและยังไม่ได้เชื่อมต่อ API" },
      );
    } catch {
      setOutcome({ tone: "error", text: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm shadow-slate-200/40">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#06a94a]">
              <Image src="/icons/line.svg" width={20} height={20} alt="" unoptimized />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">สถานะการแจ้งเตือน</p>
              <h2 id="line-enabled" className="mt-1 text-base font-semibold text-slate-900">เปิดใช้การแจ้งเตือนผ่าน LINE</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {values.enabled ? "เปิดอยู่ — กรอกข้อมูลเชื่อมต่อให้ครบก่อนบันทึก" : "ปิดอยู่ — ระบบจะไม่ส่งข้อความเข้า LINE"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:min-w-36">
            <span className="text-sm font-semibold text-slate-700">{values.enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
            <Switch aria-labelledby="line-enabled" checked={values.enabled} onCheckedChange={(c) => set("enabled", c)} />
          </div>
        </div>
        <div className="flex items-start gap-2 border-t border-emerald-100 bg-white/70 px-5 py-3 text-xs leading-5 text-slate-600 sm:px-6">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>หน้านี้ใช้ข้อมูลตัวอย่าง การบันทึกและส่งข้อความทดสอบยังไม่เชื่อมต่อ LINE API</span>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <CredentialsCard values={values} errors={errors} set={set} />
        <WebhookCard />
        <NotificationCard values={values} errors={errors} set={set} />
        <TestMessageCard values={values} />
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] backdrop-blur xl:bottom-0 xl:left-[220px]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-end gap-3 px-4 py-3 sm:px-6">
          {outcome && <div className="mr-auto min-w-0 flex-1"><ResultNotice tone={outcome.tone}>{outcome.text}</ResultNotice></div>}
          <Button type="button" variant="outline" onClick={() => { setValues(initial); setErrors({}); setOutcome(null); }}>
            ยกเลิกการแก้ไข
          </Button>
          <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</Button>
        </div>
      </div>
    </form>
  );
}
