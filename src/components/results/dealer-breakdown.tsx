import { Amount } from "@/components/dealers/amount";
import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { summarize, type PeriodMap } from "@/lib/calc";
import { formatNumber } from "@/lib/format";
import type { Bill, Dealer } from "@/lib/types";

interface Props {
  dealers: Dealer[] | null;
  bills: Bill[] | null;
  periods: PeriodMap;
  confirmed: boolean;
}

export function DealerBreakdown({ dealers, bills, periods, confirmed }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-base font-semibold text-slate-900">สรุปตามเจ้ามือ</h3>
      {!dealers || !bills ? (
        <Skeleton className="h-28" />
      ) : dealers.length === 0 ? (
        <EmptyState title="ไม่มีข้อมูลเจ้ามือ" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2.5 pr-3 font-medium">เจ้ามือ</th>
                <th className="py-2.5 pr-3 text-right font-medium">ยอดขาย</th>
                <th className="py-2.5 pr-3 text-right font-medium">เงินรางวัล</th>
                <th className="py-2.5 text-right font-medium">กำไร–ขาดทุน</th>
              </tr>
            </thead>
            <tbody>
              {dealers.map((d) => {
                const ids = new Set(d.collectors.map((c) => c.id));
                const t = summarize(bills.filter((b) => ids.has(b.collectorId)), periods);
                return (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-3 font-medium text-slate-900">{d.name}</td>
                    <td className="py-3 pr-3 text-right"><Amount value={t.purchase} /></td>
                    <td className="py-3 pr-3 text-right">{confirmed ? <Amount value={t.prize} /> : <span className="text-slate-400">-</span>}</td>
                    <td className="py-3 text-right">
                      {confirmed ? (
                        <Amount value={t.confirmedPurchase - t.prize} kind="net" />
                      ) : (
                        <span className="text-xs text-slate-500">รอผล {formatNumber(t.pendingPurchase)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
