import { LotteryFlag } from "@/components/dealers/lottery-flag";
import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { lotteryName, type PeriodRow } from "@/lib/report";
import type { Lottery } from "@/lib/types";

const LOTTERIES: Lottery[] = ["thai", "lao"];

/** ยอดขายแยกตามประเภทหวย: ซีรีส์เดียว สีเดียว ประเภทระบุด้วยธงและชื่อ */
export function LotteryBars({ rows }: { rows: PeriodRow[] | null }) {
  const sums = LOTTERIES.map((l) => ({
    lottery: l,
    purchase: (rows ?? []).filter((r) => r.period.lottery === l).reduce((s, r) => s + r.totals.purchase, 0),
  }));
  const max = Math.max(1, ...sums.map((s) => s.purchase));
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <h2 className="mb-3 text-base font-semibold text-slate-900">ยอดขายตามประเภทหวย</h2>
      {!rows ? (
        <Skeleton className="h-20" />
      ) : sums.every((s) => s.purchase === 0) ? (
        <EmptyState title="ไม่มีข้อมูลในช่วงที่เลือก" />
      ) : (
        <ul className="flex flex-col gap-3.5">
          {sums.map((s) => (
            <li key={s.lottery} title={`${lotteryName[s.lottery]}: ยอดขาย ${formatNumber(s.purchase)} บาท`}>
              <p className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-900">
                <LotteryFlag lottery={s.lottery} />
                {lotteryName[s.lottery]}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-3 flex-1">
                  <div
                    className="h-full rounded-r-[4px] bg-[var(--series-1)]"
                    style={{ width: `${(s.purchase / max) * 100}%`, minWidth: s.purchase > 0 ? 2 : 0 }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-semibold tabular-nums text-slate-900">{formatNumber(s.purchase)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
