import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Totals } from "@/lib/calc";
import { formatBaht, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

function Card({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{children}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/**
 * มุมมองของเจ้ามือ: กำไร–ขาดทุน = ยอดขาย − เงินรางวัลที่ต้องจ่าย (เฉพาะงวดที่ยืนยันผลแล้ว)
 * ตรงข้ามกับ "ได้–เสีย" ของลูกค้าในหน้าเจ้ามือและลูกค้า
 */
export function ResultsSummary({ totals, winnerCount, confirmed }: { totals: Totals | null; winnerCount: number; confirmed: boolean }) {
  if (!totals) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }
  const profit = totals.confirmedPurchase - totals.prize;
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Card label="ยอดขายรวม" hint="รวมทุกเจ้ามือ">
        <span className="text-slate-900">{formatBaht(totals.purchase)}</span>
      </Card>
      <Card label="เงินรางวัลที่ต้องจ่าย" hint={confirmed ? "รวมทุกบิลที่ถูกรางวัล" : "ยังไม่ประกาศผล"}>
        <span className="text-slate-900">{confirmed ? formatBaht(totals.prize) : "-"}</span>
      </Card>
      <Card label="กำไร–ขาดทุน" hint={confirmed ? "ยอดขาย − เงินรางวัล" : "คำนวณหลังยืนยันผล"}>
        {confirmed ? (
          <span className={cn(profit < 0 ? "text-red-600" : "text-emerald-600")}>{formatSigned(profit)} บาท</span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </Card>
      <Card label="บิลที่ถูกรางวัล" hint={totals.outstanding > 0 ? `ค้างชำระรวม ${formatBaht(totals.outstanding)}` : undefined}>
        <span className="text-slate-900">{confirmed ? `${winnerCount} บิล` : "-"}</span>
      </Card>
    </div>
  );
}
