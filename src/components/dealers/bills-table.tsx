import { EmptyState } from "@/components/ui/state-panels";
import { formatDate } from "@/lib/format";
import type { Bill, Period } from "@/lib/types";
import { Amount } from "./amount";
import { BillStatusBadge, LotteryBadge } from "./bill-badges";
import { LotteryFlag } from "./lottery-flag";

interface BillsTableProps {
  bills: Bill[];
  periods: ReadonlyMap<string, Period>;
  /** customerId → ชื่อ; bill ที่ customerId = null แสดง ownLabel */
  customerNames: ReadonlyMap<string, string>;
  ownLabel: string;
  showCustomer?: boolean;
  showPrize?: boolean;
  /** แสดงประเภทหวยเป็นธงอย่างเดียว ใช้ในการ์ดที่พื้นที่แคบ */
  compact?: boolean;
}

export function BillsTable({ bills, periods, customerNames, ownLabel, showCustomer = true, showPrize = false, compact = false }: BillsTableProps) {
  if (bills.length === 0) return <EmptyState title="ไม่มีบิลในช่วงที่เลือก" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="py-2 pr-3 font-medium">เลขบิล</th>
            {showCustomer && <th className="py-2 pr-3 font-medium">ลูกค้า</th>}
            <th className="py-2 pr-3 font-medium">ประเภท</th>
            <th className="whitespace-nowrap py-2 pr-3 text-right font-medium">จำนวนเงิน</th>
            {showPrize && <th className="py-2 pr-3 text-right font-medium">รางวัล</th>}
            <th className="py-2 font-medium">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => {
            const period = periods.get(b.periodId);
            return (
              <tr key={b.id} className="border-b border-slate-50 last:border-0">
                <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-slate-800">{b.no}</td>
                {showCustomer && (
                  <td className="py-2.5 pr-3 text-slate-700">{b.customerId ? customerNames.get(b.customerId) ?? "-" : ownLabel}</td>
                )}
                <td className="py-2.5 pr-3">
                  {compact ? (
                    <LotteryFlag lottery={b.lottery} className="text-base" />
                  ) : (
                  <div className="flex flex-col items-start gap-0.5">
                    <LotteryBadge lottery={b.lottery} />
                    {period && (
                      <span className="text-xs text-slate-500">
                        {formatDate(period.drawDate)}{period.status === "pending" && " · รอผล"}
                      </span>
                    )}
                  </div>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right"><Amount value={b.amount} /></td>
                {showPrize && <td className="py-2.5 pr-3 text-right"><Amount value={b.prize} /></td>}
                <td className="py-2.5"><BillStatusBadge bill={b} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
