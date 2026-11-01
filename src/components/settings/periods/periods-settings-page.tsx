"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Plus } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-panels";
import { useRemote } from "@/hooks/use-remote";
import { formatDate, lotteryLabel } from "@/lib/format";
import type { Lottery } from "@/lib/types";
import { createPeriod, fetchPeriods } from "@/services/dealers-service";
import { SettingsTabs } from "../settings-tabs";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

export function PeriodsSettingsPage() {
  const [nonce, setNonce] = useState(0);
  const { data: periods, error } = useRemote(`settings-periods-${nonce}`, fetchPeriods);
  const [lottery, setLottery] = useState<Lottery>("thai");
  const [drawDate, setDrawDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [minimumDate, setMinimumDate] = useState("");
  useEffect(() => setMinimumDate(today()), []);
  const sortedPeriods = useMemo(() => [...(periods ?? [])].sort((a, b) => b.drawDate.localeCompare(a.drawDate)), [periods]);

  async function save() {
    setNotice(null);
    if (!drawDate) { setNotice({ ok: false, text: "กรุณาเลือกวันที่ออกรางวัล" }); return; }
    if (minimumDate && drawDate < minimumDate) { setNotice({ ok: false, text: "สามารถสร้างงวดล่วงหน้าได้ แต่วันที่ต้องไม่ย้อนหลัง" }); return; }
    setSaving(true);
    try {
      await createPeriod(lottery, drawDate);
      setDrawDate("");
      setNotice({ ok: true, text: `สร้างงวด${lotteryLabel[lottery]} ${formatDate(drawDate)} แล้ว` });
      setNonce((n) => n + 1);
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "สร้างงวดไม่สำเร็จ กรุณาลองใหม่" });
    } finally { setSaving(false); }
  }

  return (
    <>
      <TopBar breadcrumb={["ตั้งค่า", "งวดหวย"]} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28">
        <SettingsTabs current="/settings/periods" />
        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">จัดการงวดหวย</h1><p className="mt-1 text-sm text-slate-500">สร้างงวดล่วงหน้าตามวันที่ออกรางวัล เพื่อเตรียมรับเลขก่อนถึงวันออกผล</p></div>
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2"><Calendar className="size-5 text-blue-600" /><h2 className="font-semibold text-slate-900">สร้างงวดใหม่</h2></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[180px_220px_auto] sm:items-end">
            <label className="text-sm font-medium text-slate-700">ประเภทหวย<Select value={lottery} onValueChange={(value) => setLottery(value as Lottery)}><SelectTrigger className="mt-1" aria-label="ประเภทหวย" /><SelectContent><SelectItem value="thai">หวยไทย</SelectItem><SelectItem value="lao">หวยลาว</SelectItem></SelectContent></Select></label>
            <label className="text-sm font-medium text-slate-700">วันที่ออกรางวัล<Input className="mt-1" type="date" min={minimumDate || undefined} value={drawDate} onChange={(e) => setDrawDate(e.target.value)} aria-label="วันที่ออกรางวัล" /></label>
            <Button onClick={() => void save()} disabled={saving}>{saving ? "กำลังสร้าง..." : <><Plus className="size-4" /> สร้างงวด</>}</Button>
          </div>
          {notice && <p role="status" className={`mt-3 rounded-lg p-3 text-sm ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</p>}
        </section>
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><h2 className="font-semibold text-slate-900">งวดที่มีอยู่</h2>{error ? <div className="mt-3"><ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดรายการงวดไม่สำเร็จ</ErrorState></div> : !periods ? <Skeleton className="mt-3 h-32 rounded-lg" /> : sortedPeriods.length === 0 ? <p className="mt-3 text-sm text-slate-500">ยังไม่มีงวด สร้างงวดแรกได้จากแบบฟอร์มด้านบน</p> : <div className="mt-3 divide-y divide-slate-100">{sortedPeriods.map((period) => <div key={period.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-medium text-slate-800">{lotteryLabel[period.lottery]} · งวด {formatDate(period.drawDate)}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${period.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{period.status === "confirmed" ? "ยืนยันผลแล้ว" : "เปิดรับ / รอผล"}</span></div>)}</div>}</section>
      </main>
    </>
  );
}
