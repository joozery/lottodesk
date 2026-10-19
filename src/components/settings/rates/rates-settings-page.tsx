"use client";

import { useMemo, useState } from "react";
import { Info } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-panels";
import { useRemote } from "@/hooks/use-remote";
import { BET_LABEL, RATES } from "@/lib/prize-calc";
import type { BetType, Dealer } from "@/lib/types";
import { fetchDealers } from "@/services/mock-service";
import { readRateConfig, resolveRates, saveRateConfig, type RateConfig, type RateOverrides } from "@/services/rate-store";
import { SettingsTabs } from "../settings-tabs";

const TYPES = Object.keys(RATES) as BetType[];

/** ขอบเขตที่ตั้งอัตรา: "dealer:<id>" หรือ "customer:<id>" */
type Scope = string;

export function RatesSettingsPage() {
  const [nonce, setNonce] = useState(0);
  const { data: dealers, error } = useRemote(`rates-dealers-${nonce}`, fetchDealers);
  const { data: initial } = useRemote(`rates-config-${nonce}`, async () => readRateConfig());

  return (
    <>
      <TopBar breadcrumb={["ตั้งค่า", "อัตราจ่าย"]} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28">
        <SettingsTabs current="/settings/rates" />
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">อัตราจ่าย</h1>
            <p className="mt-1 text-sm text-slate-500">เจ้ามือและลูกค้าแต่ละรายจ่ายไม่เท่ากันได้ — ช่องที่เว้นว่างจะใช้อัตราของระดับที่สูงกว่า</p>
          </div>
          <Badge tone="orange">ข้อมูลตัวอย่าง</Badge>
        </div>
        {error ? (
          <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState>
        ) : !dealers || !initial ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : (
          <RatesEditor dealers={dealers} initial={initial} />
        )}
      </main>
    </>
  );
}

const draftOf = (o: RateOverrides) => Object.fromEntries(TYPES.map((t) => [t, o[t] ? String(o[t]) : ""])) as Record<BetType, string>;
const overridesOf = (c: RateConfig, scope: Scope) => {
  const [kind, id] = scope.split(":");
  return (kind === "dealer" ? c.dealers : c.customers)[id] ?? {};
};

function RatesEditor({ dealers, initial }: { dealers: Dealer[]; initial: RateConfig }) {
  const [config, setConfig] = useState<RateConfig>(initial);
  const first: Scope = `dealer:${dealers[0]?.id ?? ""}`;
  const [scope, setScope] = useState<Scope>(first);
  const [draft, setDraft] = useState<Record<BetType, string>>(() => draftOf(overridesOf(initial, first)));
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  function changeScope(next: Scope) {
    setScope(next);
    setDraft(draftOf(overridesOf(config, next)));
    setNotice(null);
  }

  const [kind, id] = scope.split(":") as ["dealer" | "customer", string];

  // อัตราที่จะสืบทอดเมื่อเว้นว่าง
  const inherited = useMemo(() => {
    if (kind === "dealer") return RATES;
    const dealer = dealers.find((d) => d.collectors.some((c) => c.customers.some((cu) => cu.id === id)));
    return resolveRates({ dealers: config.dealers, customers: {} }, dealer?.id, null);
  }, [kind, id, dealers, config.dealers]);

  const parsed = TYPES.map((t) => ({ t, raw: draft[t].trim(), n: Number(draft[t]) }));
  const invalid = parsed.filter((p) => p.raw !== "" && !(Number.isFinite(p.n) && p.n > 0));

  function save() {
    if (invalid.length) return;
    const next: RateOverrides = {};
    for (const p of parsed) if (p.raw !== "") next[p.t] = p.n;
    const updated: RateConfig = { ...config, [kind === "dealer" ? "dealers" : "customers"]: { ...(kind === "dealer" ? config.dealers : config.customers), [id]: next } };
    if (saveRateConfig(updated)) {
      setConfig(updated);
      setNotice({ ok: true, text: "บันทึกอัตราจ่ายแล้ว บิลและผลรางวัลจะคำนวณด้วยอัตราใหม่" });
    } else {
      setNotice({ ok: false, text: "บันทึกไม่สำเร็จ กรุณาตรวจพื้นที่จัดเก็บในเบราว์เซอร์" });
    }
  }

  const overridden = [
    ...dealers.filter((d) => Object.keys(config.dealers[d.id] ?? {}).length).map((d) => ({ scope: `dealer:${d.id}`, label: `${d.name} (เจ้ามือ)`, rates: config.dealers[d.id] })),
    ...dealers.flatMap((d) => d.collectors.flatMap((c) => c.customers))
      .filter((cu) => Object.keys(config.customers[cu.id] ?? {}).length)
      .map((cu) => ({ scope: `customer:${cu.id}`, label: `${cu.name} (ลูกค้า)`, rates: config.customers[cu.id] })),
  ];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <label className="block text-sm font-medium text-slate-700">
          ตั้งอัตราจ่ายของ
          <Select value={scope} onValueChange={changeScope}>
            <SelectTrigger className="mt-1 sm:max-w-sm" aria-label="เลือกเจ้ามือหรือลูกค้า" />
            <SelectContent>
              <SelectGroup>
                <SelectLabel>เจ้ามือ</SelectLabel>
                {dealers.map((d) => <SelectItem key={d.id} value={`dealer:${d.id}`}>{d.name}</SelectItem>)}
              </SelectGroup>
              {dealers.map((d) => (
                <SelectGroup key={d.id}>
                  <SelectLabel>ลูกค้าของ {d.name}</SelectLabel>
                  {d.collectors.flatMap((c) => c.customers.map((cu) => <SelectItem key={cu.id} value={`customer:${cu.id}`}>{cu.name} · ผ่าน {c.name}</SelectItem>))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </label>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-600">
              <th className="rounded-l-lg px-3 py-2.5 font-medium">ประเภท</th>
              <th className="px-3 py-2.5 text-right font-medium">{kind === "dealer" ? "เริ่มต้น" : "ใช้อยู่ตอนนี้"}</th>
              <th className="rounded-r-lg px-3 py-2.5 font-medium">จ่าย (บาทละ)</th>
            </tr>
          </thead>
          <tbody>
            {TYPES.map((t) => (
              <tr key={t} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-800">{BET_LABEL[t]}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{inherited[t]}</td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={draft[t]}
                    placeholder={String(inherited[t])}
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
          <Button onClick={save} disabled={invalid.length > 0}>บันทึก</Button>
          <Button variant="ghost" onClick={() => setDraft(blank())}>ล้างทั้งหมด (ใช้ค่าสืบทอด)</Button>
          {invalid.length > 0 && <span role="alert" className="text-xs text-red-600">อัตราต้องเป็นเลขมากกว่า 0</span>}
        </div>
        {notice && (
          <p role="status" className={`mt-3 flex gap-2 rounded-lg p-3 text-xs ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            <Info className="mt-0.5 size-4 shrink-0" /> {notice.text}
          </p>
        )}
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">ที่ตั้งไว้แล้ว</h2>
          {overridden.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">ยังใช้อัตราเริ่มต้นทั้งหมด</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {overridden.map((o) => (
                <li key={o.scope}>
                  <button type="button" onClick={() => changeScope(o.scope)} className="w-full py-2 text-left hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">{o.label}</p>
                    <p className="text-xs text-slate-500">
                      {TYPES.filter((t) => o.rates[t]).map((t) => `${BET_LABEL[t]} ${o.rates[t]}`).join(" · ")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <Info className="mt-0.5 size-4 shrink-0" />
          ลำดับการใช้อัตรา: ลูกค้า → เจ้ามือ → ค่าเริ่มต้น เช่น ตั้ง 3 ตัวบนของเจ้ามือเป็น 600 ลูกค้าคนใดที่ไม่ได้ตั้งเองก็จะได้ 600
        </p>
      </aside>
    </div>
  );
}

function blank(): Record<BetType, string> {
  return Object.fromEntries(TYPES.map((t) => [t, ""])) as Record<BetType, string>;
}
