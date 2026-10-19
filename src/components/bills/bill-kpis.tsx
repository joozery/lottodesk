import type { ReactNode } from "react";
import { Clock3, Coins, FileText } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BillTotals {
  count: number;
  amount: number;
  wonCount: number;
  prize: number;
  unpaidCount: number;
  outstanding: number;
}

function Tile({ icon, tone, label, hint, children }: { icon: ReactNode; tone: string; label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
      <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-full [&>svg]:size-5", tone)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-bold tabular-nums">{children}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

export function BillKpis({ totals }: { totals: BillTotals | null }) {
  if (!totals) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Tile icon={<FileText />} tone="bg-blue-50 text-blue-600" label="จำนวนบิล" hint="ในช่วงที่เลือก">
        <span className="text-slate-900">{formatNumber(totals.count)} บิล</span>
      </Tile>
      <Tile icon={<Coins />} tone="bg-emerald-50 text-emerald-600" label="ยอดซื้อสุทธิ" hint={`ถูกรางวัล ${formatNumber(totals.wonCount)} บิล`}>
        <span className="text-slate-900">฿{formatNumber(totals.amount)}</span>
      </Tile>
      <Tile icon={<Clock3 />} tone="bg-orange-50 text-orange-600" label="ค้างชำระ" hint={`${formatNumber(totals.unpaidCount)} บิล`}>
        <span className={cn(totals.outstanding > 0 ? "text-orange-600" : "text-slate-900")}>฿{formatNumber(totals.outstanding)}</span>
      </Tile>
    </div>
  );
}
