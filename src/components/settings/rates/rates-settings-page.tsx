"use client";

import { useState } from "react";
import { Info } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-panels";
import { useRemote } from "@/hooks/use-remote";
import { BET_LABEL, RATES } from "@/lib/prize-calc";
import type { BetType, Dealer } from "@/lib/types";
import { fetchDealers } from "@/services/dealers-service";
import type { RateConfig, RateOverrides } from "@/lib/rates";
import { fetchRates, saveCommission, saveRates } from "@/services/rates-service";
import { SettingsTabs } from "../settings-tabs";

const TYPES = Object.keys(RATES) as BetType[];

type Notice = { ok: boolean; text: string } | null;

export function RatesSettingsPage() {
  const [nonce, setNonce] = useState(0);
  const { data: dealers, error: dealersError } = useRemote(`rates-dealers-${nonce}`, fetchDealers);
  const { data: initial, error: ratesError } = useRemote(`rates-config-${nonce}`, fetchRates);
  const error = dealersError || ratesError;

  return (
    <>
      <TopBar breadcrumb={["ตั้งค่า", "อัตราจ่าย"]} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28">
        <SettingsTabs current="/settings/rates" />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">อัตราจ่าย</h1>
          <p className="mt-1 text-sm text-slate-500">อัตราจ่ายใช้กับทุกคนเหมือนกัน และตั้งเปอร์เซ็นต์ค่าคอมมิชชันแยกตามเจ้ามือ</p>
        </div>
        {error ? (
          <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState>
        ) : !dealers || !initial ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <PayoutRates initial={initial.rates} />
            <Commissions dealers={dealers} initial={initial.commissions} />
          </div>
        )}
      </main>
    </>
  );
}

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p role="status" className={`mt-3 flex gap-2 rounded-lg p-3 text-xs ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
      <Info className="mt-0.5 size-4 shrink-0" /> {notice.text}
    </p>
  );
}

const draftOf = (o: RateOverrides) => Object.fromEntries(TYPES.map((t) => [t, o[t] ? String(o[t]) : ""])) as Record<BetType, string>;
const blank = () => draftOf({});

/* ---------- อัตราจ่าย (บาทละ) — ใช้กับทุกคน ---------- */
function PayoutRates({ initial }: { initial: RateOverrides }) {
  const [draft, setDraft] = useState(() => draftOf(initial));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const parsed = TYPES.map((t) => ({ t, raw: draft[t].trim(), n: Number(draft[t]) }));
  const invalid = parsed.filter((p) => p.raw !== "" && !(Number.isFinite(p.n) && p.n > 0));

  async function save() {
    if (invalid.length) return;
    const next: RateOverrides = {};
    for (const p of parsed) if (p.raw !== "") next[p.t] = p.n;
    setSaving(true);
    try {
      await saveRates(next);
      setNotice({ ok: true, text: "บันทึกอัตราจ่ายแล้ว บิลและผลรางวัลของทุกคนจะคำนวณด้วยอัตราใหม่" });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="font-semibold text-slate-900">อัตราจ่าย (ใช้กับทุกคน)</h2>
      <p className="mt-1 text-xs text-slate-500">เว้นว่างเพื่อใช้ค่าเริ่มต้น</p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-600">
            <th className="rounded-l-lg px-3 py-2.5 font-medium">ประเภท</th>
            <th className="px-3 py-2.5 text-right font-medium">เริ่มต้น</th>
            <th className="rounded-r-lg px-3 py-2.5 font-medium">จ่าย (บาทละ)</th>
          </tr>
        </thead>
        <tbody>
          {TYPES.map((t) => (
            <tr key={t} className="border-b border-slate-100">
              <td className="px-3 py-2 font-medium text-slate-800">{BET_LABEL[t]}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-500">{RATES[t]}</td>
              <td className="px-3 py-2">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={draft[t]}
                  placeholder={String(RATES[t])}
                  aria-label={`อัตราจ่าย ${BET_LABEL[t]}`}
                  aria-invalid={invalid.some((p) => p.t === t)}
                  onChange={(e) => setDraft((d) => ({ ...d, [t]: e.target.value }))}
                  className="w-28"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => void save()} disabled={invalid.length > 0 || saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
        <Button variant="ghost" onClick={() => setDraft(blank())}>ล้างทั้งหมด (ใช้ค่าเริ่มต้น)</Button>
        {invalid.length > 0 && <span role="alert" className="text-xs text-red-600">อัตราต้องเป็นเลขมากกว่า 0</span>}
      </div>
      <NoticeBox notice={notice} />
    </section>
  );
}

/* ---------- ค่าคอมมิชชันของเจ้ามือ (%) ---------- */
function Commissions({ dealers, initial }: { dealers: Dealer[]; initial: Record<string, number> }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(dealers.map((d) => [d.id, String(initial[d.id] ?? 0)])));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const bad = (id: string) => {
    const n = Number(draft[id]);
    return draft[id].trim() === "" || !Number.isFinite(n) || n < 0 || n > 100;
  };
  const changed = dealers.filter((d) => !bad(d.id) && Number(draft[d.id]) !== (saved[d.id] ?? 0));
  const anyBad = dealers.some((d) => bad(d.id));

  async function save() {
    setSaving(true);
    try {
      let config: RateConfig | null = null;
      for (const d of changed) config = await saveCommission(d.id, Number(draft[d.id]));
      if (config) setSaved(config.commissions);
      setNotice({ ok: true, text: "บันทึกค่าคอมมิชชันแล้ว" });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="font-semibold text-slate-900">ค่าคอมมิชชันเจ้ามือ (%)</h2>
      <p className="mt-1 text-xs text-slate-500">ตั้งเปอร์เซ็นต์ของเจ้ามือแต่ละราย (0–100)</p>
      {dealers.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">ยังไม่มีเจ้ามือ เพิ่มได้ที่หน้าเจ้ามือและลูกค้า</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {dealers.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate text-sm font-medium text-slate-800">{d.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  inputMode="decimal"
                  value={draft[d.id]}
                  aria-label={`ค่าคอมมิชชัน ${d.name}`}
                  aria-invalid={bad(d.id)}
                  onChange={(e) => { setDraft((s) => ({ ...s, [d.id]: e.target.value })); setNotice(null); }}
                  className="w-24"
                />
                <span className="text-sm text-slate-500">%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => void save()} disabled={changed.length === 0 || anyBad || saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
        {anyBad && <span role="alert" className="text-xs text-red-600">เปอร์เซ็นต์ต้องอยู่ระหว่าง 0–100</span>}
      </div>
      <NoticeBox notice={notice} />
    </section>
  );
}
