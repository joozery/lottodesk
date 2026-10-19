import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBaht, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PaymentTotals {
  received: number;
  paid: number;
  outstanding: number;
}

function Tile({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{children}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function PaymentKpis({ totals }: { totals: PaymentTotals | null }) {
  if (!totals) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
      </div>
    );
  }
  const net = totals.received - totals.paid;
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Tile label="รับเงินรวม" hint="เงินที่รับเข้าในช่วงที่เลือก">
        <span className="text-emerald-600">{formatBaht(totals.received)}</span>
      </Tile>
      <Tile label="จ่ายเงินรวม" hint="เงินที่จ่ายออกในช่วงที่เลือก">
        <span className="text-slate-900">{formatBaht(totals.paid)}</span>
      </Tile>
      <Tile label="เงินสุทธิ" hint="รับ − จ่าย">
        <span className={cn(net < 0 ? "text-red-600" : "text-slate-900")}>{formatSigned(net)} บาท</span>
      </Tile>
      <Tile label="ค้างรับ" hint="ยอดค้างชำระของบิลในช่วงที่เลือก">
        <span className={cn(totals.outstanding > 0 ? "text-orange-600" : "text-slate-900")}>{formatBaht(totals.outstanding)}</span>
      </Tile>
    </div>
  );
}
