import type { ReactNode } from "react";
import { AlertCircle, Trophy } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { GroupSummary } from "@/lib/calc";
import { formatBaht } from "@/lib/format";

function Card({ icon, tone, label, children, hint, className }: {
  icon: ReactNode; tone: string; label: string; children: ReactNode; hint?: string; className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 ${className ?? ""}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="text-lg font-bold leading-snug tabular-nums">{children}</div>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export function FinancialSummaryCards({ summary, payerName }: { summary: GroupSummary | null; payerName: string }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[74px] rounded-xl" />)}
      </div>
    );
  }
  const { prize, outstanding, pendingPurchase } = summary.total;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <Card
        icon={<Trophy className="size-5" />}
        tone="bg-emerald-50 text-emerald-600"
        label="ยอดถูกรางวัล"
        hint={pendingPurchase > 0 ? `รอผล ${formatBaht(pendingPurchase)} (ยังไม่นับ)` : "เฉพาะงวดที่ยืนยันผลแล้ว"}
      >
        <span className="text-slate-900">{formatBaht(prize)}</span>
      </Card>
      <Card icon={<AlertCircle className="size-5" />} tone="bg-orange-50 text-orange-600" label="ค้างชำระ">
        <span className={outstanding > 0 ? "text-orange-600" : "text-slate-900"}>{formatBaht(outstanding)}</span>
      </Card>
      <Card
        icon={<Avatar name={payerName} className="size-9" />}
        tone="p-0"
        label="ผู้ชำระเงิน"
        hint="เคลียร์ยอดรวมกลุ่ม"
        className="col-span-2 md:col-span-1"
      >
        <span className="text-slate-900">{payerName}</span>
      </Card>
    </div>
  );
}
