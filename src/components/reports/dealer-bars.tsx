import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatSigned } from "@/lib/format";
import { profitOf, type DealerRow } from "@/lib/report";
import { cn } from "@/lib/utils";

/** แท่งแนวนอนเรียงจากมากไปน้อย: ซีรีส์เดียว สีเดียว ค่าอยู่ที่ปลายแท่ง */
export function DealerBars({ rows }: { rows: DealerRow[] | null }) {
  const max = Math.max(1, ...(rows ?? []).map((r) => r.totals.purchase));
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <h2 className="mb-3 text-base font-semibold text-slate-900">ยอดขายตามเจ้ามือ</h2>
      {!rows ? (
        <Skeleton className="h-32" />
      ) : rows.every((r) => r.totals.purchase === 0) ? (
        <EmptyState title="ไม่มีข้อมูลในช่วงที่เลือก" />
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map(({ dealer, totals }) => {
            const profit = totals.confirmedPurchase > 0 ? profitOf(totals) : null;
            return (
              <li key={dealer.id} title={`${dealer.name}: ยอดขาย ${formatNumber(totals.purchase)} บาท`}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-900">{dealer.name}</span>
                  <span className="text-xs text-slate-500">
                    กำไร–ขาดทุน{" "}
                    {profit === null ? (
                      <span className="text-slate-400">รอผล</span>
                    ) : (
                      <span className={cn("font-medium tabular-nums", profit < 0 ? "text-red-600" : "text-emerald-600")}>
                        {formatSigned(profit)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 flex-1">
                    <div
                      className="h-full rounded-r-[4px] bg-[var(--series-1)]"
                      style={{ width: `${(totals.purchase / max) * 100}%`, minWidth: totals.purchase > 0 ? 2 : 0 }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-semibold tabular-nums text-slate-900">{formatNumber(totals.purchase)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
