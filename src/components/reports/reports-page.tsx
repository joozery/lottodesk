"use client";

import { useState } from "react";
import { Download } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/state-panels";
import { useDealersData } from "@/hooks/use-dealers-data";
import { downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { debtorRows, dealerRows, lotteryName, periodRows, reportTotals } from "@/lib/report";
import type { LotteryFilter as LotteryValue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DealerBars } from "./dealer-bars";
import { DebtorsTable } from "./debtors-table";
import { KpiTiles } from "./kpi-tiles";
import { LotteryBars } from "./lottery-bars";
import { PeriodChart } from "./period-chart";
import { PeriodTable } from "./period-table";
import { ReportFilters, type DateRange } from "./report-filters";

const OCTOBER: DateRange = { from: "2026-10-01", to: "2026-10-31" };
const SECOND_HALF: DateRange = { from: "2026-10-16", to: "2026-10-31" };

export function ReportsPage() {
  const [lottery, setLottery] = useState<LotteryValue>("all");
  const [range, setRange] = useState<DateRange>(OCTOBER);
  const [nonce, setNonce] = useState(0);

  const data = useDealersData(nonce, () => ({ lottery, periodId: null, ...range }));
  const { dealers, periods, ledger } = data;

  const allDates = (periods ?? []).map((p) => p.drawDate).sort();
  const presets = [
    { label: "ตุลาคม 2569", range: OCTOBER },
    { label: "16–31 ต.ค.", range: SECOND_HALF },
    ...(allDates.length ? [{ label: "ทุกงวด", range: { from: allDates[0], to: allDates[allDates.length - 1] } }] : []),
  ];

  // skeleton เฉพาะครั้งแรก; เปลี่ยนตัวกรองแล้วโหลดซ้ำ ใช้ข้อมูลเดิมแบบจางๆ
  const ready = !!(dealers && periods && ledger);
  const refreshing = data.ledgerLoading && ready;

  const inScope = (periods ?? []).filter(
    (p) => (lottery === "all" || p.lottery === lottery) && p.drawDate >= range.from && p.drawDate <= range.to,
  );
  const periodMap = new Map((periods ?? []).map((p) => [p.id, p]));
  const bills = ledger?.bills ?? [];
  const rows = ready ? periodRows(bills, inScope, periodMap) : null;
  const totals = rows ? reportTotals(rows) : null;
  const dealerData = ready ? dealerRows(dealers, bills, periodMap) : null;
  const debtors = ready ? debtorRows(dealers, bills) : null;

  function exportCsv() {
    if (!rows || !totals) return;
    downloadCsv(`lottodesk-report-${range.from}_${range.to}.csv`, [
      ["งวด", "ประเภทหวย", "ยอดขาย", "เงินรางวัล", "กำไร-ขาดทุน", "ค้างชำระ", "สถานะ"],
      ...[...rows].reverse().map((r) => [
        r.period.drawDate,
        lotteryName[r.period.lottery],
        r.totals.purchase,
        r.profit === null ? "" : r.totals.prize,
        r.profit === null ? "" : r.profit,
        r.totals.outstanding,
        r.period.status === "confirmed" ? "ยืนยันผลแล้ว" : "รอผล",
      ]),
      ["รวม", "", totals.purchase, totals.prize, totals.profit, totals.outstanding, ""],
    ]);
  }

  return (
    <>
      <TopBar breadcrumb={["รายงาน"]} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">รายงาน</h1>
              <Badge tone="orange">ข้อมูลตัวอย่าง</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              สรุปยอดขาย เงินรางวัล และกำไร–ขาดทุน ช่วง {formatDate(range.from)} – {formatDate(range.to)}
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!rows || rows.length === 0}>
            <Download /> ส่งออก CSV
          </Button>
        </div>

        <ReportFilters lottery={lottery} onLotteryChange={setLottery} range={range} onRangeChange={setRange} presets={presets} />

        {data.error ? (
          <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState>
        ) : (
          <div className={cn("flex flex-col gap-4 transition-opacity", refreshing && "pointer-events-none opacity-60")} aria-busy={refreshing}>
            <KpiTiles totals={totals} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <PeriodChart rows={rows} />
              <div className="flex min-w-0 flex-col gap-4">
                <DealerBars rows={dealerData} />
                <LotteryBars rows={rows} />
              </div>
            </div>
            <PeriodTable rows={rows} totals={totals} />
            <DebtorsTable rows={debtors} />
          </div>
        )}
      </main>
    </>
  );
}
