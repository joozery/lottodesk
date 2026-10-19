import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportTotals } from "@/lib/report";
import { formatBaht, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

function Tile({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold sm:text-xl">{children}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function KpiTiles({ totals }: { totals: ReportTotals | null }) {
  if (!totals) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
      </div>
    );
  }
  const hasConfirmed = totals.confirmedPurchase > 0;
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Tile label="ยอดขายรวม" hint={totals.pendingPurchase > 0 ? `รวมงวดรอผล ${formatBaht(totals.pendingPurchase)}` : undefined}>
        <span className="tabular-nums">{formatBaht(totals.purchase)}</span>
      </Tile>
      <Tile label="เงินรางวัลที่ต้องจ่าย" hint="เฉพาะงวดที่ยืนยันผลแล้ว">
        <span className="tabular-nums">{formatBaht(totals.prize)}</span>
      </Tile>
      <Tile label="กำไร–ขาดทุน" hint={hasConfirmed ? "ยอดขาย − เงินรางวัล (งวดที่ยืนยันผลแล้ว)" : "ยังไม่มีงวดที่ยืนยันผล"}>
        {hasConfirmed ? (
          <span className={cn("tabular-nums", totals.profit < 0 ? "text-red-600" : "text-emerald-600")}>
            {formatSigned(totals.profit)} บาท
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </Tile>
      <Tile label="ค้างชำระรวม">
        <span className={cn("tabular-nums", totals.outstanding > 0 ? "text-orange-600" : "text-slate-900")}>
          {formatBaht(totals.outstanding)}
        </span>
      </Tile>
    </div>
  );
}
