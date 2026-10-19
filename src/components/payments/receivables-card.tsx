import { Amount } from "@/components/dealers/amount";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import type { DebtorRow } from "@/lib/report";

interface Props {
  rows: DebtorRow[] | null;
  onReceive: (row: DebtorRow) => void;
}

/** ค้างรับ: ลูกหนี้ที่ยังมียอดค้างชำระ กด "รับเงิน" เพื่อเปิดฟอร์มพร้อมข้อมูลของลูกค้า */
export function ReceivablesCard({ rows, onReceive }: Props) {
  const total = rows?.reduce((s, r) => s + r.amount, 0) ?? 0;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">ค้างรับ</h2>
        {rows && rows.length > 0 && <span className="text-sm text-slate-500">รวม <Amount value={total} kind="outstanding" className="font-semibold" /> บาท</span>}
      </div>
      {!rows ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <EmptyState title="ไม่มียอดค้างรับ" hint="ลูกค้าชำระครบแล้วในช่วงที่เลือก" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
                <p className="truncate text-xs text-slate-500">{r.dealer} → {r.collector} · {r.billCount} บิล</p>
              </div>
              <Amount value={r.amount} kind="outstanding" className="text-sm font-semibold" />
              {/* โพยตัวเองของผู้รวบรวมไม่ผูกกับลูกค้า จึงหักยอดค้างจากการรับเงินไม่ได้ */}
              {r.customerId ? (
                <Button size="sm" variant="soft" onClick={() => onReceive(r)}>รับเงิน</Button>
              ) : (
                <span className="w-[58px]" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
