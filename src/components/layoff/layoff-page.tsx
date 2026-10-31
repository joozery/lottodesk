"use client";

import { useMemo, useState } from "react";
import { LotteryFilter } from "@/components/dealers/lottery-filter";
import { Info, Search, Trash2 } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state-panels";
import { useRemote } from "@/hooks/use-remote";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { defaultPeriodId } from "@/lib/period";
import { BET_LABEL } from "@/lib/prize-calc";
import type { BetType, LayoffSheet, Lottery, NumberExposure } from "@/lib/types";
import { fetchPeriods } from "@/services/dealers-service";
import { createLayoff, deleteLayoff, fetchExposure, fetchTargets } from "@/services/risk-service";
import { LayoffSheetDialog } from "./layoff-sheet-dialog";

const MAX_ROWS = 300;
const rowKey = (r: Pick<NumberExposure, "type" | "number">) => `${r.type}:${r.number}`;
const TYPE_OPTIONS = Object.keys(BET_LABEL) as BetType[];
type Notice = { ok: boolean; text: string } | null;

export function LayoffPage() {
  const [nonce, setNonce] = useState(0);
  const [lottery, setLottery] = useState<Lottery>("thai");
  const [periodChoice, setPeriodChoice] = useState<string | null>(null);
  const periodsRemote = useRemote("layoff-periods", fetchPeriods);
  const periods = useMemo(() => (periodsRemote.data ?? []).filter((p) => p.lottery === lottery).sort((a, b) => b.drawDate.localeCompare(a.drawDate)), [periodsRemote.data, lottery]);
  const periodId = periodChoice && periods.some((p) => p.id === periodChoice) ? periodChoice : periodsRemote.data ? defaultPeriodId(periodsRemote.data, lottery) : null;
  const period = periods.find((p) => p.id === periodId);
  const exposureRemote = useRemote(`layoff-exposure-${periodId}-${nonce}`, periodId ? () => fetchExposure(periodId) : null, { keepPrevious: true });
  const targetsRemote = useRemote(`layoff-targets-${nonce}`, fetchTargets);
  const exposure = exposureRemote.data;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<BetType | "all">("all");
  const [onlyOver, setOnlyOver] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [target, setTarget] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [viewing, setViewing] = useState<LayoffSheet | null>(null);

  const rows = useMemo(() => {
    const q = search.trim();
    return (exposure?.rows ?? []).filter((r) => (typeFilter === "all" || r.type === typeFilter) && (!q || r.number.includes(q)) && (!onlyOver || r.over > 0 || r.excess > 0));
  }, [exposure, search, typeFilter, onlyOver]);

  const picked = (exposure?.rows ?? []).flatMap((r) => {
    const n = Number(amounts[rowKey(r)]);
    return amounts[rowKey(r)]?.trim() && Number.isFinite(n) && n > 0 ? [{ row: r, amount: n }] : [];
  });
  const tooMuch = picked.filter((p) => p.amount > p.row.retained);
  const pickedTotal = picked.reduce((s, p) => s + p.amount, 0);
  const overCount = (exposure?.rows ?? []).filter((r) => r.excess > 0).length;
  const excessTotal = (exposure?.rows ?? []).reduce((s, r) => s + r.excess, 0);

  function fillExcess(list: NumberExposure[]) {
    setAmounts((a) => ({ ...a, ...Object.fromEntries(list.filter((r) => r.excess > 0).map((r) => [rowKey(r), String(r.excess)])) }));
    setNotice(null);
  }

  async function submit() {
    if (!periodId || !picked.length || tooMuch.length) return;
    setSaving(true);
    try {
      const sheet = await createLayoff({ periodId, target, note: memo, lines: picked.map((p) => ({ type: p.row.type, number: p.row.number, amount: p.amount })) });
      setAmounts({});
      setMemo("");
      setNonce((n) => n + 1);
      setViewing(sheet);
      setNotice({ ok: true, text: `สร้างแผ่นตีออก ${sheet.no} แล้ว` });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "สร้างแผ่นตีออกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(sheet: LayoffSheet) {
    if (!window.confirm(`ลบแผ่นตีออก ${sheet.no}? ยอดจะกลับมานับเป็นยอดที่เรารับเอง`)) return;
    try { await deleteLayoff(sheet.id); setNonce((n) => n + 1); setNotice({ ok: true, text: `ลบแผ่น ${sheet.no} แล้ว` }); }
    catch (e) { setNotice({ ok: false, text: e instanceof Error ? e.message : "ลบไม่สำเร็จ" }); }
  }

  const error = periodsRemote.error || exposureRemote.error;
  return (
    <>
      <TopBar breadcrumb={["รายการบิล", "ยอดซื้อ/ตีออก"]} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ยอดซื้อและตีออก</h1>
            <p className="mt-1 text-sm text-slate-500">ดูยอดซื้อรวมต่อเลข พิมพ์ยอดที่ต้องการตีออกเอง แล้วสร้างแผ่นตีออกส่งต่อให้เจ้ามือ</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LotteryFilter value={lottery} onChange={(v) => { if (v !== "all") { setLottery(v); setPeriodChoice(null); setAmounts({}); } }} includeAll={false} />
            <Select value={periodId ?? ""} onValueChange={(id) => { setPeriodChoice(id); setAmounts({}); }}>
              <SelectTrigger className="w-44" aria-label="งวดหวย" />
              <SelectContent>{periods.map((p) => <SelectItem key={p.id} value={p.id}>{formatDate(p.drawDate)}{p.status === "confirmed" ? " · ยืนยันผลแล้ว" : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {error ? <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState> : !periodsRemote.data || (periodId && !exposure) ? <Skeleton className="h-96 rounded-xl" /> : !periodId || !exposure ? <EmptyState title="ยังไม่มีงวด" hint="สร้างงวดได้ที่หน้าคีย์โพย" /> : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="ยอดซื้อรวม" value={exposure.totalBought} />
              <Stat label="ตีออกแล้ว" value={exposure.totalLaidOff} />
              <Stat label="เรารับเอง" value={exposure.totalBought - exposure.totalLaidOff} />
              <Stat label={`ยังเกินวงเงิน (${formatNumber(overCount)} เลข)`} value={excessTotal} tone={excessTotal > 0 ? "warn" : undefined} />
            </div>
            {Object.keys(exposure.limits).length === 0 && (
              <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><Info className="mt-0.5 size-4 shrink-0" /> ยังไม่ได้ตั้งวงเงินรับ ระบบจะยังไม่แจ้งเตือนเลขเกิน ตั้งได้ที่ ตั้งค่า &gt; วงเงินรับ (ตีออกเลขใดก็ได้ตามต้องการ)</p>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value.replace(/\D/g, ""))} placeholder="ค้นหาเลข" inputMode="numeric" aria-label="ค้นหาเลข" className="w-36 pl-8" />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as BetType | "all")}>
                  <SelectTrigger className="w-36" aria-label="ประเภท" />
                  <SelectContent><SelectItem value="all">ทุกประเภท</SelectItem>{TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{BET_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-sm text-slate-600"><input type="checkbox" checked={onlyOver} onChange={(e) => setOnlyOver(e.target.checked)} className="size-4" /> เฉพาะเลขเกินวงเงิน</label>
                <Button variant="soft" className="ml-auto" onClick={() => fillExcess(exposure.rows)} disabled={excessTotal <= 0}>ใส่ยอดเกินทุกเลข</Button>
                <Button variant="ghost" onClick={() => setAmounts({})} disabled={picked.length === 0 && Object.keys(amounts).length === 0}>ล้างที่พิมพ์</Button>
              </div>
              {exposure.rows.length === 0 ? <EmptyState title="ยังไม่มียอดซื้อในงวดนี้" hint="คีย์โพยแล้วยอดซื้อต่อเลขจะแสดงที่นี่" /> : rows.length === 0 ? <EmptyState title="ไม่พบเลขตามเงื่อนไข" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600">
                        <th className="rounded-l-lg px-3 py-2 text-left font-medium">ประเภท</th>
                        <th className="px-3 py-2 text-center font-medium">เลข</th>
                        <th className="px-3 py-2 text-right font-medium">ยอดซื้อ</th>
                        <th className="px-3 py-2 text-right font-medium">วงเงิน</th>
                        <th className="px-3 py-2 text-right font-medium">ตีออกแล้ว</th>
                        <th className="px-3 py-2 text-right font-medium">เรารับเอง</th>
                        <th className="px-3 py-2 text-right font-medium">ยังเกิน</th>
                        <th className="rounded-r-lg px-3 py-2 text-right font-medium">ตีออกครั้งนี้</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, MAX_ROWS).map((r) => {
                        const v = amounts[rowKey(r)] ?? "";
                        const bad = v.trim() !== "" && !(Number(v) > 0 && Number(v) <= r.retained);
                        return (
                          <tr key={rowKey(r)} className={`border-b border-slate-100 ${r.excess > 0 ? "bg-orange-50/60" : ""}`}>
                            <td className="px-3 py-1.5 text-slate-600">{BET_LABEL[r.type]}</td>
                            <td className="px-3 py-1.5 text-center text-base font-bold tabular-nums">{r.number}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.total)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{r.limit === null ? "-" : formatNumber(r.limit)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{r.laidOff ? formatNumber(r.laidOff) : "-"}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.retained)}</td>
                            <td className={`px-3 py-1.5 text-right tabular-nums ${r.excess > 0 ? "font-semibold text-orange-700" : "text-slate-400"}`}>{r.excess > 0 ? formatNumber(r.excess) : "-"}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center justify-end gap-1">
                                {r.excess > 0 && <button type="button" onClick={() => fillExcess([r])} className="rounded px-1.5 text-xs text-blue-600 hover:bg-blue-50">ใส่ยอดเกิน</button>}
                                <Input type="number" min="0" step="any" inputMode="decimal" value={v} aria-label={`ยอดตีออก ${BET_LABEL[r.type]} ${r.number}`} aria-invalid={bad} onChange={(e) => { setAmounts((a) => ({ ...a, [rowKey(r)]: e.target.value })); setNotice(null); }} className="w-24 text-right" />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {rows.length > MAX_ROWS && <p className="mt-2 text-center text-xs text-slate-500">แสดง {formatNumber(MAX_ROWS)} จาก {formatNumber(rows.length)} เลข — ค้นหาหรือกรองเพื่อดูเลขอื่น</p>}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">สร้างแผ่นตีออก</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-500">ตีออกให้ (เจ้ามือปลายทาง)
                  <Input value={target} onChange={(e) => setTarget(e.target.value)} list="layoff-targets" maxLength={100} placeholder="พิมพ์ชื่อเจ้ามือ" className="mt-1" />
                  <datalist id="layoff-targets">{(targetsRemote.data ?? []).map((t) => <option key={t} value={t} />)}</datalist>
                </label>
                <label className="text-xs font-medium text-slate-500">หมายเหตุ (ถ้ามี)
                  <Input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={300} className="mt-1" />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={() => void submit()} disabled={picked.length === 0 || tooMuch.length > 0 || saving}>{saving ? "กำลังสร้าง..." : "สร้างแผ่นตีออก"}</Button>
                <span className="text-sm text-slate-600">{picked.length ? `${formatNumber(picked.length)} เลข · รวม ${formatNumber(pickedTotal)} บาท` : "พิมพ์ยอดตีออกในช่อง ตีออกครั้งนี้ ของเลขที่ต้องการ"}</span>
                {tooMuch.length > 0 && <span role="alert" className="text-xs text-red-600">เลข {tooMuch.map((p) => p.row.number).join(", ")} ตีออกเกินยอดที่เรารับเอง</span>}
              </div>
              {notice && <p role="status" className={`mt-3 flex gap-2 rounded-lg p-3 text-xs ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}><Info className="mt-0.5 size-4 shrink-0" /> {notice.text}</p>}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">แผ่นตีออกที่สร้างแล้ว</h2>
              {exposure.sheets.length === 0 ? <EmptyState title="ยังไม่มีแผ่นตีออกในงวดนี้" /> : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {exposure.sheets.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{s.no} · {s.target || "ไม่ระบุปลายทาง"}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(s.at)} · {s.actor} · {formatNumber(s.lines.length)} เลข · รวม {formatNumber(s.total)} บาท</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="soft" size="sm" onClick={() => setViewing(s)}>เปิด / ส่งต่อ</Button>
                        <Button variant="ghost" size="icon" aria-label={`ลบ ${s.no}`} onClick={() => void remove(s)}><Trash2 /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
      <LayoffSheetDialog key={viewing?.id ?? "none"} sheet={viewing} period={period} onClose={() => setViewing(null)} />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className={`rounded-xl border p-3.5 ${tone === "warn" ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone === "warn" ? "text-orange-700" : "text-slate-900"}`}>{formatNumber(value)} <span className="text-sm font-medium text-slate-500">บาท</span></p>
    </div>
  );
}
