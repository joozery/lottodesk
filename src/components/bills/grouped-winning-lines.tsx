"use client";

import { useRemote } from "@/hooks/use-remote";
import type { BillView } from "@/lib/bills";
import { formatNumber } from "@/lib/format";
import { BET_LABEL, linePrize, RATES } from "@/lib/prize-calc";
import { fetchPrizeResult } from "@/services/results-service";

export function GroupedWinningLines({ rows }: { rows: BillView[] }) {
  const periodId = rows[0]?.bill.periodId;
  const result = useRemote(`group-winning-lines-${periodId ?? "none"}`, periodId ? () => fetchPrizeResult(periodId) : null);
  if (!rows.length || !result.data) return null;
  const winners = rows.flatMap((row) => row.bill.lines.flatMap((line) => {
    const rates = { ...RATES, ...(row.bill.rates ?? {}), ...(row.bill.rateOverrides?.[line.number] ?? {}) };
    const payout = linePrize(line, row.bill.lottery, result.data!, rates);
    return payout > 0 ? [{ type: BET_LABEL[line.type], number: line.number, amount: line.amount, payout }] : [];
  }));
  if (!winners.length) return null;
  return <section className="mx-4 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="mb-2 text-sm font-semibold text-emerald-800">เลขที่ถูกรางวัล</p><div className="space-y-1.5">{winners.map((winner, index) => <div key={`${winner.type}-${winner.number}-${index}`} className="flex items-center justify-between rounded bg-emerald-100 px-2.5 py-2 text-sm"><span className="font-medium text-emerald-900">{winner.type} · {winner.number}</span><span className="tabular-nums text-emerald-800">แทง {formatNumber(winner.amount)} · จ่าย {formatNumber(winner.payout)} บาท</span></div>)}</div></section>;
}
