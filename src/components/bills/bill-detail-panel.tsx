"use client";

import Link from "next/link";
import { X } from "@/components/icons";
import { LotteryFlag } from "@/components/dealers/lottery-flag";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemote } from "@/hooks/use-remote";
import { paymentStatusOf, resultOf, type BillView } from "@/lib/bills";
import { formatDate, formatDateTimeFull, formatNumber, lotteryLabel } from "@/lib/format";
import { BET_LABEL, RATES, linePrize } from "@/lib/prize-calc";
import { cn } from "@/lib/utils";
import { fetchPrizeResult } from "@/services/results-service";
import { PaymentBadge } from "./bill-badges";
import { BillShareActions } from "./bill-share-actions";

const baht = (n: number) => `฿${formatNumber(n)}`;

const PAYMENT_BOX = {
  paid: "bg-emerald-50 text-emerald-800",
  partial: "bg-blue-50 text-blue-800",
  unpaid: "bg-orange-50 text-orange-800",
} as const;

/** แผงรายละเอียดบิล: ใช้ทั้งแบบติดข้างรายการ (จอใหญ่) และใน drawer (จอเล็ก) */
export function BillDetailPanel({ view, onClose }: { view: BillView; onClose?: () => void }) {
  const { bill, period } = view;
  const prize = useRemote(`bill-prize-${bill.periodId}`, () => fetchPrizeResult(bill.periodId));
  const rates = bill.rates ?? RATES;
  const confirmed = resultOf(view) !== "pending";
  const status = paymentStatusOf(bill);
  const paid = bill.amount - bill.outstanding;
  const paidPct = bill.amount > 0 ? Math.round((paid / bill.amount) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">รายละเอียดบิล</h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="ปิด" className="-mr-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X />
          </button>
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-2xl font-bold tracking-tight text-navy">{bill.no}</p>
          <PaymentBadge bill={bill} />
        </div>
        <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
          <LotteryFlag lottery={bill.lottery} />
          {lotteryLabel[bill.lottery]} · งวด {period ? formatDate(period.drawDate) : "-"}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">ซื้อเมื่อ {formatDateTimeFull(bill.createdAt)}</p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-lg bg-slate-50 px-3.5 py-3 text-sm">
        <dt className="text-slate-500">เจ้ามือ</dt><dd className="font-medium text-slate-900">{view.dealer}</dd>
        <dt className="text-slate-500">ผู้ส่งโพย</dt><dd className="font-medium text-slate-900">{view.collector}</dd>
        <dt className="text-slate-500">เจ้าของโพย</dt><dd className="font-medium text-slate-900">{view.customer}{view.code ? ` (${view.code})` : ""}</dd>
      </dl>

      <section aria-label="รายการเลข" className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[1.3fr_1fr_1fr] bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-500">
          <span>ประเภท</span><span className="text-center">เลข</span><span className="text-right">เงิน</span>
        </div>
        {confirmed && prize.loading && <Skeleton className="m-3 h-16" />}
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {bill.lines.map((line, i) => {
            const win = confirmed && prize.data ? linePrize(line, bill.lottery, prize.data, rates) : 0;
            return (
              <li key={i} className={cn("grid grid-cols-[1.3fr_1fr_1fr] items-center px-3.5 py-2 text-sm", win > 0 && "bg-emerald-50/70")}>
                <span className="text-slate-800">
                  {BET_LABEL[line.type]}
                  <span className="block text-[11px] text-slate-400">× {rates[line.type]}</span>
                </span>
                <span className="text-center font-mono text-base font-bold tracking-wider text-slate-900">{line.number}</span>
                <span className="text-right tabular-nums text-slate-900">
                  {baht(line.amount)}
                  {win > 0 && <span className="block text-xs font-semibold text-emerald-600">ถูก +{formatNumber(win)}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between border-t border-slate-200 px-3.5 py-2 text-sm font-semibold">
          <span>รวม ({formatNumber(bill.lines.length)} รายการ)</span>
          <span className="tabular-nums">{baht(bill.amount)}</span>
        </div>
        {confirmed && (
          <div className="flex justify-between border-t border-slate-100 px-3.5 py-2 text-sm">
            <span className="text-slate-500">เงินรางวัล</span>
            <span className={cn("font-semibold tabular-nums", bill.prize > 0 ? "text-emerald-600" : "text-slate-400")}>{baht(bill.prize)}</span>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between rounded-lg bg-navy px-4 py-3 text-white">
        <span className="font-semibold">ยอดสุทธิ</span>
        <span className="text-2xl font-bold tabular-nums">{baht(bill.amount)}</span>
      </div>

      <div className={cn("rounded-lg px-3.5 py-3 text-sm", PAYMENT_BOX[status])}>
        <p className="font-semibold">รับแล้ว {baht(paid)} · ค้าง {baht(bill.outstanding)}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100} aria-label="สัดส่วนที่ชำระแล้ว">
          <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${paidPct}%` }} />
        </div>
      </div>

      <BillShareActions view={view} />

      <div className="flex justify-between text-sm">
        {bill.outstanding > 0 ? <Link href="/payments" className="font-medium text-blue-700 hover:underline">ไปรับเงิน</Link> : <span />}
        <Link href="/entry" className="font-medium text-blue-700 hover:underline">คีย์โพยเพิ่ม</Link>
      </div>
    </div>
  );
}
