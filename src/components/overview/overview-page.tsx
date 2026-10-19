"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";
import { BarChart3, ChevronRight, Clock3, Download, Plus, Receipt, Search, Trophy, Users, Wallet } from "@/components/icons";
import { LotteryFilter } from "@/components/dealers/lottery-filter";
import { LotteryFlag } from "@/components/dealers/lottery-flag";
import { PeriodFilter } from "@/components/dealers/period-filter";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-panels";
import { useDealersData } from "@/hooks/use-dealers-data";
import { summarize } from "@/lib/calc";
import { formatDate, formatNumber, lotteryLabel } from "@/lib/format";
import type { Activity, Bill, Dealer, Lottery, LotteryFilter as LotteryValue, Period } from "@/lib/types";

const DEFAULT_RANGE = { from: "2026-10-01", to: "2026-10-16" };
const money = (n: number) => `฿${formatNumber(n)}`;

function downloadSummary(rows: DealerRow[], label: string) {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const lines = [
    ["เจ้ามือ", "จำนวนบิล", "ยอดซื้อ", "ถูกรางวัล", "ค้างชำระ"],
    ...rows.map((r) => [r.name, r.billCount, r.purchase, r.prize, r.outstanding]),
  ];
  const csv = `\uFEFF${lines.map((row) => row.map(quote).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lottodesk-overview-${label}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface DealerRow {
  id: string;
  name: string;
  billCount: number;
  purchase: number;
  prize: number;
  outstanding: number;
}

function MetricCard({ icon: Icon, label, value, detail, tone, href }: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "orange" | "navy";
  href: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-600",
    navy: "bg-indigo-50 text-indigo-700",
  }[tone];
  const valueColor = {
    blue: "text-blue-600",
    green: "text-emerald-700",
    orange: "text-orange-600",
    navy: "text-[#11295b]",
  }[tone];
  return (
    <Link href={href} className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-blue-200 hover:shadow-md">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${colors}`}><Icon className="size-6" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-semibold text-[#142451]">{label}</p>
          <ChevronRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
        </div>
        <p className={`mt-1 text-[26px] font-bold leading-none tracking-tight tabular-nums ${valueColor}`}>{value}</p>
        <p className="mt-2 truncate text-xs text-slate-500" title={detail}>{detail}</p>
      </div>
    </Link>
  );
}

function dateOffset(date: string, offset: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function TrendChart({ bills, endDate, days, onDaysChange }: { bills: Bill[]; endDate: string; days: 7 | 14; onDaysChange: (days: 7 | 14) => void }) {
  const points = Array.from({ length: days }, (_, i) => {
    const date = dateOffset(endDate, i - days + 1);
    return { date, value: bills.filter((b) => b.createdAt.slice(0, 10) === date).reduce((sum, b) => sum + b.amount, 0) };
  });
  const max = Math.max(1000, ...points.map((p) => p.value));
  const ceiling = Math.ceil(max / 1000) * 1000;
  const x = (i: number) => 42 + (i * 628) / Math.max(points.length - 1, 1);
  const y = (value: number) => 158 - (value / ceiling) * 130;
  const line = points.map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.value)}`).join(" ");
  const area = `${line} L ${x(points.length - 1)} 158 L ${x(0)} 158 Z`;
  const ticks = [ceiling, ceiling / 2, 0];

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#102356]">แนวโน้มยอดขาย</h2>
          <p className="mt-0.5 text-xs text-slate-500">ยอดซื้อรายวันจากบิลในช่วงที่เลือก</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span className="size-2.5 rounded-full bg-blue-600" /> ยอดขาย
          <select value={days} onChange={(e) => onDaysChange(Number(e.target.value) as 7 | 14)} aria-label="ช่วงกราฟ" className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600">
            <option value={7}>7 วัน</option>
            <option value={14}>14 วัน</option>
          </select>
        </label>
      </div>
      <div className="w-full overflow-hidden">
        <svg viewBox="0 0 700 198" role="img" aria-label={`กราฟยอดขาย ${days} วันล่าสุด`} className="h-[210px] w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="overview-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1="42" x2="680" y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" strokeWidth="1" />
              <text x="35" y={y(tick) + 4} textAnchor="end" fill="#64748b" fontSize="11">{formatNumber(tick)}</text>
            </g>
          ))}
          {points.map((point, i) => <line key={point.date} x1={x(i)} x2={x(i)} y1="28" y2="158" stroke="#e9eff7" strokeWidth="1" />)}
          <path d={area} fill="url(#overview-trend-fill)" />
          <path d={line} fill="none" stroke="#0860ed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((point, i) => <circle key={point.date} cx={x(i)} cy={y(point.value)} r="4.5" fill="#0860ed" stroke="white" strokeWidth="2" />)}
          {points.map((point, i) => (days === 7 || i % 2 === 0 || i === points.length - 1) && (
            <text key={point.date} x={x(i)} y="182" textAnchor="middle" fill="#64748b" fontSize="11">
              {new Date(`${point.date}T00:00:00Z`).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" })}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function LotterySummary({ bills, periods, label }: { bills: Bill[]; periods: Map<string, Period>; label: string }) {
  const rows: Lottery[] = ["thai", "lao"];
  return (
    <section className="flex min-w-0 flex-col rounded-xl bg-gradient-to-br from-[#172f5a] via-[#102747] to-[#0c1d39] p-5 text-white shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">สรุปตามประเภทหวย</h2>
        <span className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-slate-200">{label}</span>
      </div>
      <div className="flex-1 divide-y divide-white/15">
        {rows.map((lottery) => {
          const totals = summarize(bills.filter((b) => b.lottery === lottery), periods);
          return (
            <div key={lottery} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-3 py-4 first:pt-0">
              <div className="flex min-w-0 items-center gap-2.5 font-semibold">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10"><LotteryFlag lottery={lottery} className="text-xl" /></span>
                <span className="truncate text-sm">{lotteryLabel[lottery]}</span>
              </div>
              <div className="border-l border-white/20 pl-3"><p className="text-[11px] text-blue-100/80">ยอดซื้อ</p><p className="mt-1 text-lg font-bold tabular-nums">{money(totals.purchase)}</p></div>
              <div className="border-l border-white/20 pl-3"><p className="text-[11px] text-blue-100/80">รางวัลที่ยืนยันแล้ว</p><p className="mt-1 text-lg font-bold tabular-nums">{money(totals.prize)}</p></div>
            </div>
          );
        })}
      </div>
      <div className="flex items-end justify-between gap-2 border-t border-white/30 pt-3">
        <span className="text-sm font-medium text-blue-100">ยอดซื้อรวมทั้งหมด</span>
        <strong className="text-2xl tabular-nums">{money(bills.reduce((sum, b) => sum + b.amount, 0))}</strong>
      </div>
    </section>
  );
}

function DealerTable({ rows, query, onQueryChange }: { rows: DealerRow[]; query: string; onQueryChange: (value: string) => void }) {
  const matches = rows.filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#102356]">สรุปยอดรายเจ้ามือ</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => onQueryChange(e.target.value)} aria-label="ค้นหาเจ้ามือ" placeholder="ค้นหาเจ้ามือ..." className="h-8 w-44 rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-600 sm:w-56" />
          </label>
          <Button asChild variant="outline" size="sm" className="text-blue-600"><Link href="/dealers">ดูทั้งหมด <ChevronRight className="size-3.5" /></Link></Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr><th className="px-3 py-2.5">เจ้ามือ</th><th className="px-3 py-2.5 text-right">จำนวนบิล</th><th className="px-3 py-2.5 text-right">ยอดซื้อ</th><th className="px-3 py-2.5 text-right">ถูกรางวัล</th><th className="px-3 py-2.5 text-right">ค้างชำระ</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matches.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/70">
                <td className="px-3 py-3 font-semibold text-[#102356]"><span className="mr-2 inline-flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Users className="size-4" /></span>{row.name}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-700">{formatNumber(row.billCount)}</td>
                <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-800">{money(row.purchase)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-700">{money(row.prize)}</td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-orange-600">{money(row.outstanding)}</td>
              </tr>
            ))}
            {matches.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">ไม่พบเจ้ามือ</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">ยอดรางวัลแสดงเฉพาะงวดที่ยืนยันผลแล้ว</p>
    </section>
  );
}

function RecentActivity({ activities }: { activities: Activity[] }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#102356]">กิจกรรมล่าสุด</h2>
        <Button asChild variant="outline" size="sm" className="text-blue-600"><Link href="/bills">ดูทั้งหมด</Link></Button>
      </div>
      <div className="divide-y divide-slate-100">
        {activities.slice(0, 4).map((activity) => {
          const prize = activity.text.includes("รางวัล");
          const at = new Date(activity.at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Bangkok" });
          return (
            <div key={activity.id} className="flex items-start gap-3 py-3">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${prize ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>{prize ? <Trophy className="size-4" /> : <Receipt className="size-4" />}</span>
              <time className="w-11 shrink-0 pt-2 text-xs tabular-nums text-slate-500">{at}</time>
              <div className="min-w-0 flex-1 border-l border-slate-200 pl-3">
                <p className="line-clamp-2 text-sm font-semibold text-[#102356]">{activity.text}</p>
                <p className="mt-0.5 text-xs text-slate-500">{activity.actor} · {lotteryLabel[activity.lottery]}</p>
              </div>
            </div>
          );
        })}
        {activities.length === 0 && <p className="py-8 text-center text-sm text-slate-500">ไม่มีกิจกรรมในช่วงที่เลือก</p>}
      </div>
    </section>
  );
}

export function OverviewPage() {
  const [lottery, setLottery] = useState<LotteryValue>("all");
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [dealerId, setDealerId] = useState("all");
  const [chartDays, setChartDays] = useState<7 | 14>(7);
  const [query, setQuery] = useState("");
  const [nonce, setNonce] = useState(0);

  const data = useDealersData(nonce, () => ({ lottery, periodId: null, ...range }));
  const periods = new Map((data.periods ?? []).map((p) => [p.id, p]));
  const periodLabel = `${formatDate(range.from)} – ${formatDate(range.to)}`;
  const selectedDealer = data.dealers?.find((d) => d.id === dealerId);
  const collectorIds = selectedDealer ? new Set(selectedDealer.collectors.map((c) => c.id)) : null;
  const bills = (data.ledger?.bills ?? []).filter((b) => !collectorIds || collectorIds.has(b.collectorId));
  const payments = (data.ledger?.payments ?? []).filter((p) => !collectorIds || collectorIds.has(p.collectorId));
  const activities = (data.ledger?.activities ?? []).filter((a) => {
    if (collectorIds && !collectorIds.has(a.collectorId)) return false;
    return a.at.slice(0, 10) >= range.from && a.at.slice(0, 10) <= range.to;
  });
  const totals = summarize(bills, periods);
  const paid = payments.filter((p) => p.direction === "in").reduce((sum, p) => sum + p.amount, 0);
  const dealerRows: DealerRow[] = (selectedDealer ? [selectedDealer] : data.dealers ?? []).map((dealer: Dealer) => {
    const ids = new Set(dealer.collectors.map((c) => c.id));
    const mine = bills.filter((b) => ids.has(b.collectorId));
    const summary = summarize(mine, periods);
    return { id: dealer.id, name: dealer.name, billCount: mine.length, purchase: summary.purchase, prize: summary.prize, outstanding: summary.outstanding };
  });
  const refreshing = data.ledgerLoading && !!data.ledger;

  return (
    <>
      <TopBar breadcrumb={["ภาพรวม"]} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#102356]">ภาพรวมธุรกิจ</h1>
            <p className="mt-1 text-sm text-slate-500">ติดตามยอดขาย การรับ–จ่าย และข้อมูลแต่ละมือ</p>
          </div>
          <Button asChild><Link href="/entry"><Plus className="size-4" /> คีย์โพยใหม่</Link></Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-100">
          <LotteryFilter value={lottery} onChange={setLottery} />
          <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <PeriodFilter lottery="all" periods={data.periods ?? []} periodId={null} onPeriodChange={() => {}} from={range.from} to={range.to} onRangeChange={(from, to) => setRange({ from, to })} />
            <Select value={dealerId} onValueChange={setDealerId}>
              <SelectTrigger className="h-10 w-44" aria-label="เจ้ามือ" />
              <SelectContent>
                <SelectItem value="all">เจ้ามือทั้งหมด</SelectItem>
                {(data.dealers ?? []).map((dealer) => <SelectItem key={dealer.id} value={dealer.id}>{dealer.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="text-blue-600" onClick={() => downloadSummary(dealerRows, `${lottery}-${range.from}-${range.to}`)} disabled={!data.ledger || !data.dealers}>
              <Download className="size-4" /> ส่งออกรายงาน
            </Button>
          </div>
        </div>
        {lottery === "lao" && <p className="-mt-2 mb-4 text-xs text-slate-500">หวยลาวออกรางวัลทุกวันจันทร์–ศุกร์ · เลือกช่วงวันที่เพื่อดูหลายงวดพร้อมกัน</p>}

        {data.error ? <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลภาพรวมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState> : !data.ledger || !data.dealers || !data.periods ? (
          <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div><div className="grid gap-4 xl:grid-cols-3"><Skeleton className="h-72 rounded-xl xl:col-span-2" /><Skeleton className="h-72 rounded-xl" /></div></div>
        ) : (
          <div className={`space-y-4 transition-opacity ${refreshing ? "pointer-events-none opacity-60" : ""}`} aria-busy={refreshing}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={BarChart3} label="ยอดขายรวม" value={money(totals.purchase)} detail={`${formatNumber(bills.length)} บิล`} tone="blue" href="/bills" />
              <MetricCard icon={Wallet} label="รับชำระแล้ว" value={money(paid)} detail={`${formatNumber(payments.filter((p) => p.direction === "in").length)} รายการรับชำระ`} tone="green" href="/payments" />
              <MetricCard icon={Clock3} label="ค้างชำระ" value={money(totals.outstanding)} detail={`${formatNumber(bills.filter((b) => b.outstanding > 0).length)} บิลค้างชำระ`} tone="orange" href="/payments" />
              <MetricCard icon={Trophy} label="รางวัลที่ยืนยันแล้ว" value={money(totals.prize)} detail={`ยอดซื้อที่ยืนยันผล ${money(totals.confirmedPurchase)}`} tone="navy" href="/results" />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-4 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2"><TrendChart bills={bills} endDate={range.to} days={chartDays} onDaysChange={setChartDays} /></div>
              <LotterySummary bills={bills} periods={periods} label={periodLabel} />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2"><DealerTable rows={dealerRows} query={query} onQueryChange={setQuery} /></div>
              <RecentActivity activities={activities} />
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-400">ข้อมูลตัวอย่างสำหรับแสดง UI · อ้างอิงเวลา Asia/Bangkok</p>
      </main>
    </>
  );
}
