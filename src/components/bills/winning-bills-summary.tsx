"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { BillView } from "@/lib/bills";
import type { PrizeResult } from "@/lib/prize";
import { BET_LABEL, linePrize, RATES } from "@/lib/prize-calc";
import { downloadBlob } from "@/lib/bill-image";
import { fetchPrizeResult } from "@/services/results-service";

type WinningRow = {
  bill: BillView;
  numbers: string[];
  count: number;
  stake: number;
  amount: number;
};

export function WinningBillsSummary({ rows }: { rows: BillView[] | null }) {
  const periodIds = useMemo(() => [...new Set((rows ?? []).map((row) => row.bill.periodId))], [rows]);
  const periodKey = periodIds.join("|");
  const [results, setResults] = useState<Record<string, PrizeResult>>({});

  useEffect(() => {
    let active = true;
    if (!periodIds.length) {
      setResults({});
      return () => { active = false; };
    }
    void Promise.all(periodIds.map(async (periodId) => {
      try {
        return [periodId, await fetchPrizeResult(periodId)] as const;
      } catch {
        return null;
      }
    })).then((items) => {
      if (!active) return;
      setResults(Object.fromEntries(items.filter((item): item is readonly [string, PrizeResult] => item !== null)));
    });
    return () => { active = false; };
  }, [periodKey]);

  const winningRows = useMemo<WinningRow[]>(() => (rows ?? []).flatMap((bill) => {
    const result = results[bill.bill.periodId];
    if (!result) return [];
    const winners = bill.bill.lines.flatMap((line) => {
      const rates = { ...RATES, ...(bill.bill.rates ?? {}), ...(bill.bill.rateOverrides?.[line.number] ?? {}) };
      const payout = linePrize(line, bill.bill.lottery, result, rates);
      return payout > 0 ? [{ label: BET_LABEL[line.type], number: line.number, stake: line.amount, payout }] : [];
    });
    if (!winners.length) return [];
    return [{
      bill,
      numbers: winners.map((winner) => `${winner.label} ${winner.number}`),
      count: winners.length,
      stake: winners.reduce((sum, winner) => sum + winner.stake, 0),
      amount: winners.reduce((sum, winner) => sum + winner.payout, 0),
    }];
  }), [results, rows]);

  if (!rows || !winningRows.length) return null;

  const totalCount = winningRows.reduce((sum, row) => sum + row.count, 0);
  const totalStake = winningRows.reduce((sum, row) => sum + row.stake, 0);
  const totalAmount = winningRows.reduce((sum, row) => sum + row.amount, 0);

  async function downloadSummaryImage() {
    const width = 1600;
    const rowHeight = 64;
    const height = 300 + winningRows.length * rowHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const font = getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = "#f0fdf4";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(32, 32, width - 64, height - 64);
    ctx.fillStyle = "#064e3b";
    ctx.font = `700 34px ${font}`;
    ctx.fillText("สรุปเลขที่ถูกรางวัล", 72, 90);
    ctx.font = `400 22px ${font}`;
    ctx.fillText(`ลูกค้าหลัก: ${winningRows[0]?.bill.customer ?? "-"}`, 72, 130);
    ctx.fillText(`แทง ${formatNumber(totalStake)} บาท · จ่าย ${formatNumber(totalAmount)} บาท`, width - 600, 130);
    const columns = [72, 360, 1050, 1160, 1300, 1450];
    const headers = ["ลูกค้าหลัก", "เลขที่ถูก", "แผ่นที่ถูก", "จำนวน", "แทงเท่าไร", "ยอดรางวัล"];
    ctx.fillStyle = "#dcfce7";
    ctx.fillRect(56, 158, width - 112, 52);
    ctx.fillStyle = "#14532d";
    ctx.font = `700 20px ${font}`;
    headers.forEach((header, index) => ctx.fillText(header, columns[index], 192));
    winningRows.forEach((row, index) => {
      const y = 250 + index * rowHeight;
      ctx.fillStyle = index % 2 ? "#f8fafc" : "#ffffff";
      ctx.fillRect(56, y - 38, width - 112, rowHeight);
      ctx.fillStyle = "#172033";
      ctx.font = `400 20px ${font}`;
      ctx.fillText(row.bill.customer, columns[0], y);
      ctx.fillText(row.numbers.join(", "), columns[1], y);
      ctx.fillText(String(row.bill.bill.sheet), columns[2], y);
      ctx.fillText(formatNumber(row.count), columns[3], y);
      ctx.fillText(`${formatNumber(row.stake)} บาท`, columns[4], y);
      ctx.fillText(`${formatNumber(row.amount)} บาท`, columns[5], y);
    });
    const footerY = 250 + winningRows.length * rowHeight + 18;
    ctx.fillStyle = "#dcfce7";
    ctx.fillRect(56, footerY - 38, width - 112, 68);
    ctx.fillStyle = "#064e3b";
    ctx.font = `700 22px ${font}`;
    ctx.fillText("รวมก่อนดำเนินการ", columns[0], footerY);
    ctx.fillText(formatNumber(totalCount), columns[3], footerY);
    ctx.fillText(`${formatNumber(totalStake)} บาท`, columns[4], footerY);
    ctx.fillText(`${formatNumber(totalAmount)} บาท`, columns[5], footerY);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) downloadBlob(blob, `สรุปเลขที่ถูกรางวัล-${winningRows[0]?.bill.customer ?? "ลูกค้า"}.png`);
  }

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5" aria-label="สรุปใบที่ถูกรางวัล">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold text-emerald-950">สรุปใบที่ถูกรางวัล</h2>
          <p className="mt-1 text-xs text-emerald-800">ตรวจสอบยอดก่อนดำเนินการจ่ายเงินรางวัล</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="text-right text-sm font-semibold text-emerald-900">
            {formatNumber(winningRows.length)} ใบ · แทง {formatNumber(totalStake)} บาท · จ่าย {formatNumber(totalAmount)} บาท
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void downloadSummaryImage()}>
            <Download className="size-4" /> บันทึกเป็นรูป
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-emerald-50 text-left text-xs text-emerald-900">
            <tr>
              <th className="px-3 py-2.5 font-medium">ลูกค้าหลัก</th>
              <th className="px-3 py-2.5 font-medium">เลขที่ถูก</th>
              <th className="px-3 py-2.5 text-center font-medium">แผ่นที่ถูก</th>
              <th className="px-3 py-2.5 text-right font-medium">จำนวน</th>
              <th className="px-3 py-2.5 text-right font-medium">แทงเท่าไร</th>
              <th className="px-3 py-2.5 text-right font-medium">ยอดรางวัล</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100">
            {winningRows.map((row) => (
              <tr key={row.bill.bill.id}>
                <td className="px-3 py-2.5 font-medium text-slate-900">{row.bill.customer}</td>
                <td className="px-3 py-2.5 text-slate-700">{row.numbers.join(", ")}</td>
                <td className="px-3 py-2.5 text-center text-slate-700">{row.bill.bill.sheet}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatNumber(row.count)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatNumber(row.stake)} บาท</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-700">{formatNumber(row.amount)} บาท</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-emerald-200 bg-emerald-50 font-semibold text-emerald-950">
            <tr>
              <td colSpan={3} className="px-3 py-2.5">รวมก่อนดำเนินการ</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(totalCount)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(totalStake)} บาท</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(totalAmount)} บาท</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
