import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state-panels";
import { formatDateTime } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { Amount } from "./amount";
import { LotteryBadge } from "./bill-badges";

export function PaymentHistory({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return <EmptyState title="ไม่มีประวัติรับ–จ่ายในช่วงที่เลือก" />;
  const sorted = [...payments].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2.5 pr-3 font-medium">เวลา</th>
            <th className="py-2.5 pr-3 font-medium">รายการ</th>
            <th className="py-2.5 pr-3 font-medium">ประเภท</th>
            <th className="py-2.5 pr-3 font-medium">รับ/จ่าย</th>
            <th className="py-2.5 text-right font-medium">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className="border-b border-slate-100">
              <td className="whitespace-nowrap py-3 pr-3 text-slate-600">{formatDateTime(p.at)}</td>
              <td className="py-3 pr-3 text-slate-800">{p.note}</td>
              <td className="py-3 pr-3"><LotteryBadge lottery={p.lottery} /></td>
              <td className="py-3 pr-3"><Badge tone={p.direction === "in" ? "green" : "neutral"}>{p.direction === "in" ? "รับเงิน" : "จ่ายเงิน"}</Badge></td>
              <td className="py-3 text-right"><Amount value={p.amount} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
