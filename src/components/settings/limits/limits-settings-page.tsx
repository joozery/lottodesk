"use client";

import { useState } from "react";
import { Info } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-panels";
import { useRemote } from "@/hooks/use-remote";
import { BET_LABEL } from "@/lib/prize-calc";
import type { BetType, Limits } from "@/lib/types";
import { DEFAULT_DISCOUNT_CONFIG, normalizeDiscounts, type DiscountConfig } from "@/lib/discount";
import { fetchDiscountTier, fetchLimits, saveDiscountTier, saveLimits } from "@/services/risk-service";
import { SettingsTabs } from "../settings-tabs";

const TYPES = Object.keys(BET_LABEL) as BetType[];
const draftOf = (l: Limits) => Object.fromEntries(TYPES.map((t) => [t, l[t] ? String(l[t]) : ""])) as Record<BetType, string>;

export function LimitsSettingsPage() {
  const [nonce, setNonce] = useState(0);
  const { data, error: e1 } = useRemote("limits-" + nonce, fetchLimits);
  const { data: discounts, error: e2 } = useRemote("discount-" + nonce, fetchDiscountTier);
  const error = e1 || e2;
  return (
    <>
      <TopBar breadcrumb={["ตั้งค่า", "วงเงินรับ/ส่วนลด"]} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28">
        <SettingsTabs current="/settings/limits" />
        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">วงเงินรับต่อเลข</h1><p className="mt-1 text-sm text-slate-500">ตั้งวงเงินและส่วนลดตั้งต้นแยกตามประเภทเลข ระบบยังรับบิลที่เกินวงเงินได้ แต่ยังไม่แตะกติกายอดเกิน</p></div>
        {error ? <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState> : !data || !discounts ? <Skeleton className="h-96 rounded-xl" /> : <LimitsAndDiscountsForm initialLimits={data} initialDiscounts={discounts} />}
      </main>
    </>
  );
}

function LimitsAndDiscountsForm({ initialLimits, initialDiscounts }: { initialLimits: Limits; initialDiscounts: DiscountConfig }) {
  const [limits, setLimits] = useState(() => draftOf(initialLimits));
  const [discounts, setDiscounts] = useState(() => normalizeDiscounts(initialDiscounts));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const currentDiscounts = normalizeDiscounts(discounts);
  const parsed = TYPES.map((t) => ({ t, raw: limits[t].trim(), n: Number(limits[t]) }));
  const invalidLimits = parsed.filter((p) => p.raw !== "" && !(Number.isFinite(p.n) && p.n > 0));
  const invalidDiscounts = [currentDiscounts.defaults.number, currentDiscounts.defaults.run].some((value) => !Number.isFinite(value) || value < 0 || value > 100) || currentDiscounts.tiers.some((tier) => !Number.isFinite(tier.threshold) || tier.threshold <= 0 || !Number.isFinite(tier.percent) || tier.percent < 0 || tier.percent > 100);
  const firstNumberTier = [...currentDiscounts.tiers].sort((a, b) => a.threshold - b.threshold)[0];

  async function save() {
    if (invalidLimits.length || invalidDiscounts) return;
    const nextLimits: Limits = {};
    for (const p of parsed) if (p.raw !== "") nextLimits[p.t] = p.n;
    setSaving(true);
    try {
      await Promise.all([saveLimits(nextLimits), saveDiscountTier(currentDiscounts)]);
      setNotice({ ok: true, text: "บันทึกวงเงินและส่วนลดตั้งต้นแล้ว" });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally { setSaving(false); }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="font-semibold text-slate-900">วงเงินรับและส่วนลดตั้งต้น</h2>
      <p className="mt-1 text-xs text-slate-500">ตั้งค่าแยกตามประเภทเลข · วงเงินเว้นว่าง = ไม่จำกัด · ส่วนลดตั้งต้น 0–100%</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
        <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="py-2 pr-3 font-medium">ประเภทเลข</th><th className="py-2 font-medium">วงเงินรับสูงสุด (บาท)</th></tr></thead>
        <tbody>{TYPES.map((type) => <tr key={type} className="border-b border-slate-100">
          <td className="py-2 pr-3 font-medium text-slate-800">{BET_LABEL[type]}</td>
          <td className="py-2 pr-3"><Input type="number" min="0" step="any" inputMode="decimal" value={limits[type]} placeholder="ไม่จำกัด" aria-label={"วงเงิน " + BET_LABEL[type]} aria-invalid={invalidLimits.some((p) => p.t === type)} onChange={(e) => { setLimits((d) => ({ ...d, [type]: e.target.value })); setNotice(null); }} className="w-40" /></td>
        </tr>)}</tbody>
      </table></div>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="font-semibold text-slate-900">ส่วนลดตามยอด</h3>
        <p className="mt-1 text-xs text-slate-500">กลุ่มเลขใช้ส่วนลดตามยอด ส่วนกลุ่มวิ่งใช้ส่วนลดตั้งต้นคงที่</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-600">ส่วนลดตั้งต้นกลุ่มเลข (%)<span className="mt-1 block text-[11px] text-slate-400">3 ตัวบน · 3 ตัวโต๊ด · 3 ตัวล่าง · 2 ตัวบน · 2 ตัวล่าง</span><Input type="number" min="0" max="100" step="any" inputMode="decimal" value={currentDiscounts.defaults.number} aria-label="ส่วนลดตั้งต้นกลุ่มเลข" onChange={(e) => { setDiscounts((d) => ({ ...normalizeDiscounts(d), defaults: { ...normalizeDiscounts(d).defaults, number: Number(e.target.value) } })); setNotice(null); }} /><span className="mt-1 block text-[11px] text-slate-400">{firstNumberTier ? `ใช้ตั้งแต่ 0 ถึงก่อน ${firstNumberTier.threshold.toLocaleString()} บาท` : "ใช้ทุกยอด เพราะยังไม่มีขั้นส่วนลด"}</span></label>
          <label className="text-xs text-slate-600">ส่วนลดตั้งต้นกลุ่มวิ่ง (%)<span className="mt-1 block text-[11px] text-slate-400">วิ่งบน · วิ่งล่าง</span><Input type="number" min="0" max="100" step="any" inputMode="decimal" value={currentDiscounts.defaults.run} aria-label="ส่วนลดตั้งต้นกลุ่มวิ่ง" onChange={(e) => { setDiscounts((d) => ({ ...normalizeDiscounts(d), defaults: { ...normalizeDiscounts(d).defaults, run: Number(e.target.value) } })); setNotice(null); }} /><span className="mt-1 block text-[11px] text-slate-400">ใช้ทุกยอด · ไม่เข้าขั้นส่วนลดตามยอด</span></label>
        </div>
        <div className="mt-3 space-y-3">
          <GlobalTierEditor discounts={currentDiscounts} setDiscounts={setDiscounts} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><Button onClick={() => void save()} disabled={invalidLimits.length > 0 || invalidDiscounts || saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button><Button variant="ghost" onClick={() => { setLimits(draftOf({})); setDiscounts({ defaults: { ...DEFAULT_DISCOUNT_CONFIG.defaults }, tiers: [] }); }}>ล้างค่าเริ่มต้น</Button>{(invalidLimits.length > 0 || invalidDiscounts) && <span role="alert" className="text-xs text-red-600">ตรวจสอบวงเงินและส่วนลดให้ถูกต้อง</span>}</div>
      {notice && <p role="status" className={"mt-3 flex gap-2 rounded-lg p-3 text-xs " + (notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}><Info className="mt-0.5 size-4 shrink-0" /> {notice.text}</p>}
    </section>
  );
}

function GlobalTierEditor({ discounts, setDiscounts }: { discounts: DiscountConfig; setDiscounts: React.Dispatch<React.SetStateAction<DiscountConfig>> }) {
  const rows = [...discounts.tiers].sort((a, b) => a.threshold - b.threshold);
  const update = (index: number, patch: Partial<{ threshold: number; percent: number }>) => setDiscounts((current) => { const normalized = normalizeDiscounts(current); const next = [...normalized.tiers].sort((a, b) => a.threshold - b.threshold).map((row, i) => i === index ? { ...row, ...patch } : row).sort((a, b) => a.threshold - b.threshold); return { ...normalized, tiers: next }; });
  return <div className="rounded-lg border border-slate-100 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-slate-800">ขั้นส่วนลดกลางของกลุ่มเลข</p><p className="mt-1 text-[11px] text-slate-500">แต่ละขั้นปรับได้ 2 ค่า: ยอดเริ่มใช้ และเปอร์เซ็นต์ส่วนลด · ไม่รวมกลุ่มวิ่ง</p></div><Button variant="outline" size="sm" onClick={() => setDiscounts((current) => { const normalized = normalizeDiscounts(current); const last = [...normalized.tiers].sort((a, b) => a.threshold - b.threshold).at(-1); const nextThreshold = !last ? 20000 : last.threshold === 20000 ? 50000 : last.threshold + 50000; const nextPercent = last?.percent ?? 0; return { ...normalized, tiers: [...normalized.tiers, { threshold: nextThreshold, percent: nextPercent }].sort((a, b) => a.threshold - b.threshold) }; })}>เพิ่มขั้น</Button></div>{rows.length === 0 && <p className="mt-2 text-xs text-slate-500">ยังไม่มีขั้น: ใช้ส่วนลดตั้งต้นกลุ่มเลขทุกยอด</p>}{rows.map((tier, index) => { const previous = rows[index - 1]?.threshold ?? 0; const next = rows[index + 1]?.threshold; const range = next === undefined ? `ตั้งแต่ ${tier.threshold.toLocaleString()} บาทขึ้นไป` : `ตั้งแต่ ${tier.threshold.toLocaleString()} ถึงก่อน ${next.toLocaleString()} บาท`; return <div key={tier.threshold + "-" + index} className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2"><label className="text-xs text-slate-600">เริ่มใช้ตั้งแต่ยอด (บาท)<Input type="number" min="1" value={tier.threshold} onChange={(e) => update(index, { threshold: Number(e.target.value) })} /><span className="mt-1 block text-[11px] text-slate-400">{range}{previous === 0 && " · ก่อนหน้านี้ใช้ส่วนลดตั้งต้น"}</span></label><label className="text-xs text-slate-600">ส่วนลด (%)<Input type="number" min="0" max="100" value={tier.percent} onChange={(e) => update(index, { percent: Number(e.target.value) })} /></label><Button variant="ghost" size="sm" onClick={() => setDiscounts((current) => { const normalized = normalizeDiscounts(current); const sorted = [...normalized.tiers].sort((a, b) => a.threshold - b.threshold); return { ...normalized, tiers: sorted.filter((_, i) => i !== index) }; })}>ลบ</Button></div>; })}</div>;
}
