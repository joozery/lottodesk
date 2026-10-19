import { Amount } from "@/components/dealers/amount";
import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import type { DebtorRow } from "@/lib/report";

export function DebtorsTable({ rows }: { rows: DebtorRow[] | null }) {
  const total = rows?.reduce((s, r) => s + r.amount, 0) ?? 0;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <h2 className="mb-3 text-base font-semibold text-slate-900">ลูกหนี้ค้างชำระ</h2>
      {!rows ? (
        <Skeleton className="h-32" />
      ) : rows.length === 0 ? (
        <EmptyState title="ไม่มียอดค้างชำระ" hint="ไม่มีบิลค้างในช่วงที่เลือก" />
      ) : (
        <>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2.5 pr-3 font-medium">ลูกค้า</th>
                <th className="py-2.5 pr-3 font-medium">เจ้ามือ → ผู้รวบรวม</th>
                <th className="py-2.5 pr-3 text-right font-medium">บิลค้าง</th>
                <th className="py-2.5 text-right font-medium">ยอดค้าง</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-slate-100">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-slate-900">{r.name}</p>
                    {r.code && <p className="text-xs text-slate-500">รหัส {r.code}</p>}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600">{r.dealer} → {r.collector}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">{r.billCount}</td>
                  <td className="py-2.5 text-right"><Amount value={r.amount} kind="outstanding" className="font-semibold" /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={3} className="rounded-l-lg px-3 py-2.5 text-slate-700">รวมค้างชำระ</td>
                <td className="rounded-r-lg py-2.5 text-right"><Amount value={total} kind="outstanding" /></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <ul className="flex flex-col gap-2.5 md:hidden">
          {rows.map((r) => (
            <li key={r.key} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.code ? `รหัส ${r.code} · ` : ""}{r.dealer} → {r.collector}</p>
                </div>
                <Amount value={r.amount} kind="outstanding" className="shrink-0 text-base font-semibold" />
              </div>
              <p className="mt-1 text-xs text-slate-500">{r.billCount} บิลค้าง</p>
            </li>
          ))}
          <li className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-semibold">
            <span>รวมค้างชำระ</span>
            <Amount value={total} kind="outstanding" />
          </li>
        </ul>
        </>
      )}
    </section>
  );
}
