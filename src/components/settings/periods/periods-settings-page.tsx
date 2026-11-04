"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, Plus, Trash2 } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-panels";
import { useRemote } from "@/hooks/use-remote";
import { formatDate, lotteryLabel } from "@/lib/format";
import { BET_LABEL, RATES } from "@/lib/prize-calc";
import type { Lottery, Period } from "@/lib/types";
import { createPeriod, fetchPeriods, updateLimitedNumbers } from "@/services/dealers-service";
import { fetchRates } from "@/services/rates-service";
import { SettingsTabs } from "../settings-tabs";
import { resetBusinessData } from "@/services/users-service";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

function uniquePermutations(value: string) {
  const result = new Set<string>();
  function visit(prefix: string, remaining: string[]) {
    if (!remaining.length) { result.add(prefix); return; }
    remaining.forEach((digit, index) => visit(prefix + digit, [...remaining.slice(0, index), ...remaining.slice(index + 1)]));
  }
  visit("", value.split(""));
  return [...result];
}

export function PeriodsSettingsPage() {
  const [nonce, setNonce] = useState(0);
  const { data: periods, error } = useRemote(`settings-periods-${nonce}`, fetchPeriods);
  const { data: rateConfig } = useRemote("settings-period-rates", fetchRates);
  const [lottery, setLottery] = useState<Lottery>("thai");
  const [drawDate, setDrawDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [minimumDate, setMinimumDate] = useState("");
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [limitEntries, setLimitEntries] = useState<Record<string, string>>({});
  const [limitNumber, setLimitNumber] = useState("");
  const [limitReverse, setLimitReverse] = useState(false);
  const [closedEntries, setClosedEntries] = useState<string[]>([]);
  const [closedNumber, setClosedNumber] = useState("");
  const [closedReverse, setClosedReverse] = useState(false);
  const [limitSaving, setLimitSaving] = useState(false);
  const [rateEntries, setRateEntries] = useState<Record<string, string>>({});
  const [limitedRateEntry, setLimitedRateEntry] = useState<Record<string, string>>({});
  const [resetting, setResetting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  useEffect(() => setMinimumDate(today()), []);
  const sortedPeriods = useMemo(() => [...(periods ?? [])].sort((a, b) => b.drawDate.localeCompare(a.drawDate)), [periods]);
  const fallbackRates = { ...RATES, ...(rateConfig?.rates ?? {}) };
  const effectiveRates = { ...fallbackRates, ...Object.fromEntries(Object.entries(rateEntries).filter(([, value]) => value !== "").map(([type, value]) => [type, Number(value)])) };

  function editLimits(period: Period) {
    if (editingPeriodId === period.id) { setEditingPeriodId(null); return; }
    setEditingPeriodId(period.id);
    setLimitEntries(Object.fromEntries((period.limitedNumbers ?? []).map((number) => [number, String(period.limitedAmounts?.[number] ?? "")])));
    setClosedEntries(period.closedNumbers ?? []);
    setRateEntries(Object.fromEntries(Object.entries(period.rates ?? {}).map(([type, value]) => [type, String(value)])));
    setLimitedRateEntry(Object.fromEntries(Object.entries(period.limitedRate ?? {}).map(([type, value]) => [type, String(value)])));
    setLimitNumber("");
    setClosedNumber("");
    setClosedReverse(false);
    setLimitReverse(false);
  }

  function addLimitEntry() {
    const number = limitNumber.trim();
    if (!/^\d{1,3}$/.test(number)) return;
    const numbers = limitReverse && number.length === 3 ? uniquePermutations(number) : [number];
    setLimitEntries((current) => Object.fromEntries([...Object.entries(current), ...numbers.map((value) => [value, ""])]));
    setLimitNumber("");
  }

  function addClosedEntry() {
    const number = closedNumber.trim();
    if (!/^\d{1,3}$/.test(number)) return;
    const numbers = closedReverse && number.length === 3 ? uniquePermutations(number) : [number];
    setClosedEntries((current) => [...new Set([...current, ...numbers])]);
    setClosedNumber("");
  }

  async function saveLimits() {
    if (!editingPeriodId) return;
    const entries = Object.entries(limitEntries);
    if (entries.some(([number]) => !/^\d{1,3}$/.test(number)) || Object.values(rateEntries).some((value) => value !== "" && (!Number.isFinite(Number(value)) || Number(value) <= 0))) return;
    setLimitSaving(true);
    try {
      await updateLimitedNumbers(editingPeriodId, entries.map(([number]) => number), {}, Object.fromEntries(Object.entries(rateEntries).filter(([, value]) => value !== "").map(([type, value]) => [type, Number(value)])), {}, Object.fromEntries(Object.entries(limitedRateEntry).filter(([, value]) => value !== "").map(([type, value]) => [type, Number(value)])), closedEntries);
      setNotice({ ok: true, text: "บันทึกเลขอั้นและวงเงินของงวดแล้ว" });
      setEditingPeriodId(null);
      setNonce((n) => n + 1);
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "บันทึกเลขอั้นไม่สำเร็จ" });
    } finally { setLimitSaving(false); }
  }

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

  async function resetBusiness() {
    if (resetConfirmation !== "ล้างข้อมูลทั้งหมด") return;
    setResetting(true);
    try {
      await resetBusinessData();
      setNotice({ ok: true, text: "รีเซ็ตข้อมูลธุรกิจทั้งหมดแล้ว ผู้ใช้ อัตราจ่าย และการตั้งค่ายังคงอยู่" });
      setResetOpen(false);
      setResetConfirmation("");
      setNonce((n) => n + 1);
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "รีเซ็ตข้อมูลไม่สำเร็จ" });
    } finally { setResetting(false); }
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
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">เลขอั้นและวงเงินรายงวด</h2>
          <p className="mt-1 text-sm text-slate-500">กำหนดเลขอั้นและอัตราจ่ายแยกตามประเภทของแต่ละเลข</p>
          <div className="mt-3 divide-y divide-slate-100">
            {sortedPeriods.map((period) => (
              <div key={`limits-${period.id}`} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{lotteryLabel[period.lottery]} · งวด {formatDate(period.drawDate)}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => editLimits(period)}>{editingPeriodId === period.id ? "ปิด" : "เพิ่มเลขอั้น"}</Button>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {(period.limitedNumbers ?? []).length > 0 ? <span>เลขอั้น: {(period.limitedNumbers ?? []).join(", ")}</span> : <span>ยังไม่ได้ตั้งเลขอั้น</span>}
                  {Object.keys(period.limitedRate ?? {}).length > 0 && <span className="ml-3">อัตราจ่ายเลขอั้นชุดเดียว: {Object.entries(period.limitedRate ?? {}).map(([type, value]) => `${BET_LABEL[type as keyof typeof RATES]} × ${value}`).join(", ")}</span>}
                </div>
                {editingPeriodId === period.id && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <div className="grid gap-2 sm:grid-cols-[120px_auto_auto] sm:items-center">
                      <Input value={limitNumber} onChange={(e) => setLimitNumber(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLimitEntry(); } }} maxLength={3} placeholder="เลข เช่น 123" aria-label="เลขอั้น" />
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={limitReverse} onChange={(e) => setLimitReverse(e.target.checked)} className="accent-blue-600" /> กลับเลข</label>
                      <Button type="button" onClick={addLimitEntry}>เพิ่ม</Button>
                    </div>
                    {Object.keys(limitEntries).length > 0 && <div className="mt-3 space-y-2">{Object.entries(limitEntries).map(([number]) => <div key={number} className="rounded border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><span className="font-mono font-semibold">{number}</span><button type="button" className="text-xs text-red-600" onClick={() => setLimitEntries((current) => { const next = { ...current }; delete next[number]; return next; })}>ลบ</button></div></div>)}</div>}
                    <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-xs font-semibold text-slate-600">อัตราจ่ายเลขอั้น (อัตโนมัติครึ่งหนึ่งของอัตราปกติ)</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(RATES).map(([type]) => <label key={type} className="text-xs text-slate-600">{BET_LABEL[type as keyof typeof RATES]}<Input className="mt-1" type="number" value={Math.round((effectiveRates[type as keyof typeof RATES] / 2) * 100) / 100} readOnly disabled /></label>)}</div></div>
                    <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-xs font-semibold text-red-700">เลขปิด (ห้ามซื้อ)</p><p className="mt-1 text-[11px] text-slate-500">เลขในรายการนี้จะไม่สามารถคีย์หรือออกบิลได้</p><div className="mt-2 grid gap-2 sm:grid-cols-[120px_auto_auto] sm:items-center"><Input value={closedNumber} onChange={(e) => setClosedNumber(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addClosedEntry(); } }} maxLength={3} placeholder="เลข เช่น 123" aria-label="เลขปิด" /><label className="inline-flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={closedReverse} onChange={(e) => setClosedReverse(e.target.checked)} className="accent-blue-600" /> กลับเลข</label><Button type="button" variant="outline" onClick={addClosedEntry}>เพิ่มเลขปิด</Button></div>{closedEntries.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{closedEntries.map((number) => <span key={number} className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 font-mono text-xs text-red-700">{number}<button type="button" onClick={() => setClosedEntries((current) => current.filter((value) => value !== number))} aria-label={`ลบเลขปิด ${number}`}>×</button></span>)}</div>}</div>
                    <div className="mt-3 flex justify-end"><Button type="button" onClick={() => void saveLimits()} disabled={limitSaving}>{limitSaving ? "กำลังบันทึก..." : "บันทึกเลขอั้นและอัตราจ่าย"}</Button></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="mt-5 rounded-xl border border-red-200 bg-red-50/50 p-4 sm:p-5">
          <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" /><div><h2 className="font-semibold text-red-900">รีเซ็ตข้อมูลธุรกิจ</h2><p className="mt-1 text-sm text-red-800">ลบข้อมูลธุรกิจทั้งหมด โดยไม่ลบผู้ใช้ อัตราจ่าย หรือการตั้งค่า</p><Button type="button" variant="outline" className="mt-3 border-red-300 text-red-700 hover:bg-red-100" onClick={() => { setResetConfirmation(""); setResetOpen(true); }} disabled={resetting}><Trash2 className="size-4" />รีเซ็ตข้อมูลธุรกิจทั้งหมด</Button></div></div>
        </section>
        {resetOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-business-title"><div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 size-6 shrink-0 text-red-600" /><div><h2 id="reset-business-title" className="text-lg font-bold text-red-900">ยืนยันการรีเซ็ตข้อมูล</h2><p className="mt-1 text-sm text-slate-600">การทำรายการนี้ลบถาวรและกู้คืนไม่ได้ ข้อมูลที่จะถูกลบคือ:</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700"><li>เจ้าดีลเลอร์ ผู้รวบรวม และลูกค้าย่อย</li><li>งวดหวยและบิลทั้งหมด</li><li>รายการรับ–จ่ายเงิน</li><li>ผลรางวัลและแผ่นตีออก</li><li>ประวัติกิจกรรม</li><li>ตัวนับเลขบิลและรหัสลูกค้า</li></ul><p className="mt-4 text-sm font-medium text-slate-700">จะไม่ลบผู้ใช้ อัตราจ่าย หรือการตั้งค่า</p><label className="mt-4 block text-sm font-medium text-slate-700">พิมพ์ <span className="font-bold text-red-700">ล้างข้อมูลทั้งหมด</span> เพื่อยืนยัน<Input className="mt-1" value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} placeholder="ล้างข้อมูลทั้งหมด" autoFocus /></label><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setResetOpen(false); setResetConfirmation(""); }} disabled={resetting}>ยกเลิก</Button><Button type="button" className="bg-red-600 hover:bg-red-700" onClick={() => void resetBusiness()} disabled={resetting || resetConfirmation !== "ล้างข้อมูลทั้งหมด"}>{resetting ? "กำลังลบข้อมูล..." : "ยืนยันลบข้อมูลทั้งหมด"}</Button></div></div></div></div></div>}
      </main>
    </>
  );
}
