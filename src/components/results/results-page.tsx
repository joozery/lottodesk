"use client";

import { useState } from "react";
import { Pencil, Plus } from "@/components/icons";
import { LotteryFilter } from "@/components/dealers/lottery-filter";
import { PeriodFilter } from "@/components/dealers/period-filter";
import { TopBar } from "@/components/layout/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/state-panels";
import { useDealersData } from "@/hooks/use-dealers-data";
import { useRemote } from "@/hooks/use-remote";
import { summarize } from "@/lib/calc";
import { defaultPeriodId } from "@/lib/period";
import type { Lottery, LotteryFilter as LotteryValue } from "@/lib/types";
import { fetchPrizeResult } from "@/services/results-service";
import { DealerBreakdown } from "./dealer-breakdown";
import { PeriodList } from "./period-list";
import { PrizeBoard } from "./prize-board";
import { PrizeResultDialog } from "./prize-result-dialog";
import { ResultsSummary } from "./results-summary";
import { WinnersTable } from "./winners-table";

const EMPTY_RANGE = { from: "", to: "" };

export function ResultsPage() {
  const [lottery, setLottery] = useState<Lottery>("thai");
  const [periodChoice, setPeriodChoice] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const data = useDealersData(nonce, (all) => {
    const valid = all.some((p) => p.id === periodChoice && p.lottery === lottery);
    const periodId = valid ? periodChoice : defaultPeriodId(all, lottery);
    return periodId ? { lottery, periodId, ...EMPTY_RANGE } : null;
  });
  const periodId = data.filter?.periodId ?? null;
  const period = data.periods?.find((p) => p.id === periodId) ?? null;

  const prize = useRemote(`prize-${nonce}-${periodId}`, periodId ? () => fetchPrizeResult(periodId) : null);

  const periodMap = new Map((data.periods ?? []).map((p) => [p.id, p]));
  const bills = data.ledger?.bills ?? null;
  const totals = bills ? summarize(bills, periodMap) : null;
  const confirmed = period?.status === "confirmed";
  const winnerCount = bills?.filter((b) => b.prize > 0).length ?? 0;
  const ready = !data.ledgerLoading && !data.baseLoading;

  const changeLottery = (v: LotteryValue) => {
    if (v === "all") return;
    setLottery(v);
    setPeriodChoice(null);
    setSaved(false);
  };

  const selectPeriod = (id: string) => {
    setPeriodChoice(id);
    setSaved(false);
  };

  return (
    <>
      <TopBar breadcrumb={["ผลรางวัล"]} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">ผลรางวัล</h1>
              <Badge tone="orange">ข้อมูลตัวอย่าง</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">ตรวจผลรางวัลและสรุปเงินรางวัลที่ต้องจ่าย แยกตามประเภทหวยและงวด</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LotteryFilter value={lottery} onChange={changeLottery} includeAll={false} />
            <div className="xl:hidden">
              <PeriodFilter
                lottery={lottery}
                periods={data.periods ?? []}
                periodId={periodId}
                onPeriodChange={selectPeriod}
                from=""
                to=""
                onRangeChange={() => {}}
              />
            </div>
            {period && (
              <Button variant={confirmed ? "outline" : "default"} onClick={() => setDialogOpen(true)}>
                {confirmed ? <Pencil /> : <Plus />} {confirmed ? "แก้ไขผลรางวัล" : "บันทึกผลรางวัล"}
              </Button>
            )}
          </div>
        </div>

        {data.error ? (
          <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="hidden xl:block">
              <PeriodList lottery={lottery} periods={data.periods ?? []} selectedId={periodId} onSelect={selectPeriod} />
            </aside>

            <div className="flex min-w-0 flex-col gap-5">
              {saved && (
                <div role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  บันทึกผลรางวัลแล้ว (เก็บในเบราว์เซอร์นี้) เงินรางวัลของทุกบิลในงวดนี้คำนวณใหม่ตามเลขที่กรอก
                </div>
              )}
              <PrizeBoard period={period} result={prize.loading ? undefined : prize.data} />
              <ResultsSummary totals={ready ? totals : null} winnerCount={winnerCount} confirmed={confirmed} />
              <div className="grid gap-5 2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <DealerBreakdown dealers={data.dealers} bills={ready ? bills : null} periods={periodMap} confirmed={confirmed} />
                <WinnersTable result={prize.data} dealers={data.dealers} bills={ready ? bills : null} pending={!confirmed && period !== null} />
              </div>
            </div>
          </div>
        )}
      </main>

      {period && (
        <PrizeResultDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          period={period}
          existing={prize.data}
          onSaved={() => {
            setSaved(true);
            setNonce((n) => n + 1);
          }}
        />
      )}
    </>
  );
}
