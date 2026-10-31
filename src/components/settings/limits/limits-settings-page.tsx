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
import { DEFAULT_DISCOUNT, type DiscountTier } from "@/lib/discount";
import { fetchDiscountTier, fetchLimits, saveDiscountTier, saveLimits } from "@/services/risk-service";
import { SettingsTabs } from "../settings-tabs";

const TYPES = Object.keys(BET_LABEL) as BetType[];
const draftOf = (l: Limits) => Object.fromEntries(TYPES.map((t) => [t, l[t] ? String(l[t]) : ""])) as Record<BetType, string>;

export function LimitsSettingsPage() {
  const [nonce, setNonce] = useState(0);
  const { data, error: e1 } = useRemote(`limits-${nonce}`, fetchLimits);
  const { data: tier, error: e2 } = useRemote(`discount-${nonce}`, fetchDiscountTier);
  const error = e1 || e2;
  return (
    <>
      <TopBar breadcrumb={["ตั้งค่า", "วงเงินรับ/ส่วนลด"]} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28">
        <SettingsTabs current="/settings/limits" />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">วงเงินรับต่อเลข</h1>
          <p className="mt-1 text-sm text-slate-500">ตั้งยอดรับสูงสุดต่อเลขแต่ละประเภท ระบบยังรับบิลที่เกินได้ แต่จะแจ้งเตือนตอนคีย์โพยและแสดงในหน้า ยอดซื้อ/ตีออก</p>
        </div>
        {error ? <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState> : !data || !tier ? <Skeleton className="h-96 rounded-xl" /> : <div className="grid items-start gap-5 lg:grid-cols-2"><LimitsForm initial={data} /><DiscountForm initial={tier} /></div>}
      </main>
    </>
  );
}

function LimitsForm({ initial }: { initial: Limits }) {
  const [draft, setDraft] = useState(() => draftOf(initial));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const parsed = TYPES.map((t) => ({ t, raw: draft[t].trim(), n: Number(draft[t]) }));
  const invalid = parsed.filter((p) => p.raw !== "" && !(Number.isFinite(p.n) && p.n > 0));

  async function save() {
    if (invalid.length) return;
    const next: Limits = {};
    for (const p of parsed) if (p.raw !== "") next[p.t] = p.n;
    setSaving(true);
    try {
      await saveLimits(next);
      setNotice({ ok: true, text: "บันทึกวงเงินแล้ว" });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="font-semibold text-slate-900">วงเงินรับสูงสุดต่อเลข (บาท)</h2>
      <p className="mt-1 text-xs text-slate-500">เว้นว่าง = ไม่จำกัด · โต๊ดนับเลขที่สลับหลักกันเป็นเลขเดียวกัน (561 = 615)</p>
      <ul className="mt-3 divide-y divide-slate-100">
        {TYPES.map((t) => (
          <li key={t} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm font-medium text-slate-800">{BET_LABEL[t]}</span>
            <Input type="number" min="0" step="any" inputMode="decimal" value={draft[t]} placeholder="ไม่จำกัด" aria-label={`วงเงิน ${BET_LABEL[t]}`} aria-invalid={invalid.some((p) => p.t === t)} onChange={(e) => { setDraft((d) => ({ ...d, [t]: e.target.value })); setNotice(null); }} className="w-36" />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => void save()} disabled={invalid.length > 0 || saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
        <Button variant="ghost" onClick={() => setDraft(draftOf({}))}>ล้างทั้งหมด (ไม่จำกัด)</Button>
        {invalid.length > 0 && <span role="alert" className="text-xs text-red-600">วงเงินต้องเป็นเลขมากกว่า 0</span>}
      </div>
      {notice && (
        <p role="status" className={`mt-3 flex gap-2 rounded-lg p-3 text-xs ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          <Info className="mt-0.5 size-4 shrink-0" /> {notice.text}
        </p>
      )}
    </section>
  );
}

function DiscountForm({ initial }: { initial: DiscountTier }) {
  const [draft, setDraft] = useState({ threshold: String(initial.threshold), below: String(initial.below), atOrAbove: String(initial.atOrAbove) });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const n = { threshold: Number(draft.threshold), below: Number(draft.below), atOrAbove: Number(draft.atOrAbove) };
  const valid = Object.values(draft).every((v) => v.trim() !== "") && n.threshold > 0 && [n.below, n.atOrAbove].every((p) => Number.isFinite(p) && p >= 0 && p <= 100);
  const set = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => { setDraft((d) => ({ ...d, [k]: e.target.value })); setNotice(null); };

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      await saveDiscountTier(n);
      setNotice({ ok: true, text: "บันทึกส่วนลดแล้ว มีผลกับบิลที่คีย์ต่อจากนี้" });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="font-semibold text-slate-900">ส่วนลดอัตโนมัติตามยอดบิล</h2>
      <p className="mt-1 text-xs text-slate-500">คิดจากยอดรวมก่อนหักส่วนลด · ลูกค้าที่บันทึกส่วนลดไว้เองจะใช้ส่วนลดของลูกค้าก่อน · พิมพ์แก้ตอนคีย์โพยได้</p>
      <div className="mt-3 space-y-3 text-sm">
        <label className="flex items-center justify-between gap-3 text-slate-800">ยอดเกณฑ์ (บาท)<Input type="number" min="0" step="any" inputMode="decimal" value={draft.threshold} onChange={set("threshold")} className="w-36" aria-label="ยอดเกณฑ์" /></label>
        <label className="flex items-center justify-between gap-3 text-slate-800">ต่ำกว่าเกณฑ์ ลด (%)<Input type="number" min="0" max="100" step="any" inputMode="decimal" value={draft.below} onChange={set("below")} className="w-36" aria-label="ส่วนลดต่ำกว่าเกณฑ์" /></label>
        <label className="flex items-center justify-between gap-3 text-slate-800">ตั้งแต่เกณฑ์ขึ้นไป ลด (%)<Input type="number" min="0" max="100" step="any" inputMode="decimal" value={draft.atOrAbove} onChange={set("atOrAbove")} className="w-36" aria-label="ส่วนลดตั้งแต่เกณฑ์ขึ้นไป" /></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => void save()} disabled={!valid || saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
        <Button variant="ghost" onClick={() => setDraft({ threshold: String(DEFAULT_DISCOUNT.threshold), below: String(DEFAULT_DISCOUNT.below), atOrAbove: String(DEFAULT_DISCOUNT.atOrAbove) })}>ใช้ค่าเริ่มต้น</Button>
        {!valid && <span role="alert" className="text-xs text-red-600">ยอดเกณฑ์ต้องมากกว่า 0 และส่วนลดอยู่ระหว่าง 0–100</span>}
      </div>
      {notice && <p role="status" className={`mt-3 flex gap-2 rounded-lg p-3 text-xs ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}><Info className="mt-0.5 size-4 shrink-0" /> {notice.text}</p>}
    </section>
  );
}
