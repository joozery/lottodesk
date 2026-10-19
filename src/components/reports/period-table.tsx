import { Amount } from "@/components/dealers/amount";
import { LotteryFlag } from "@/components/dealers/lottery-flag";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { lotteryName, type PeriodRow, type ReportTotals } from "@/lib/report";

/** ตารางรายงานรายงวด — เป็น "มุมมองตาราง" ของกราฟด้วย (ทุกค่าอ่านได้โดยไม่ต้อง hover) */
export function PeriodTable({ rows, totals }: { rows: PeriodRow[] | null; totals: ReportTotals | null }) {
  const sorted = rows ? [...rows].reverse() : null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <h2 className="mb-3 text-base font-semibold text-slate-900">รายงานรายงวด</h2>
      {!sorted || !totals ? (
        <Skeleton className="h-40" />
      ) : sorted.length === 0 ? (
        <EmptyState title="ไม่มีข้อมูลในช่วงที่เลือก" hint="ลองขยายช่วงวันที่หรือเปลี่ยนประเภทหวย" />
      ) : (
        <>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2.5 pr-3 font-medium">งวด</th>
                <th className="py-2.5 pr-3 text-right font-medium">ยอดขาย</th>
                <th className="py-2.5 pr-3 text-right font-medium">เงินรางวัล</th>
                <th className="py-2.5 pr-3 text-right font-medium">กำไร–ขาดทุน</th>
                <th className="py-2.5 pr-3 text-right font-medium">ค้างชำระ</th>
                <th className="py-2.5 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.period.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap py-2.5 pr-3">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                      <LotteryFlag lottery={r.period.lottery} />
                      {formatDate(r.period.drawDate)}
                      <span className="text-xs font-normal text-slate-500">{lotteryName[r.period.lottery]}</span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right"><Amount value={r.totals.purchase} /></td>
                  <td className="py-2.5 pr-3 text-right">{r.profit === null ? <span className="text-slate-400">-</span> : <Amount value={r.totals.prize} />}</td>
                  <td className="py-2.5 pr-3 text-right">{r.profit === null ? <span className="text-slate-400">-</span> : <Amount value={r.profit} kind="net" />}</td>
                  <td className="py-2.5 pr-3 text-right"><Amount value={r.totals.outstanding} kind="outstanding" /></td>
                  <td className="py-2.5"><Badge tone={r.period.status === "confirmed" ? "green" : "orange"}>{r.period.status === "confirmed" ? "ยืนยันผลแล้ว" : "รอผล"}</Badge></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="rounded-l-lg px-3 py-2.5 text-slate-700">รวม</td>
                <td className="py-2.5 pr-3 text-right"><Amount value={totals.purchase} /></td>
                <td className="py-2.5 pr-3 text-right"><Amount value={totals.prize} /></td>
                <td className="py-2.5 pr-3 text-right"><Amount value={totals.profit} kind="net" /></td>
                <td className="py-2.5 pr-3 text-right"><Amount value={totals.outstanding} kind="outstanding" /></td>
                <td className="rounded-r-lg" />
              </tr>
            </tfoot>
          </table>
        </div>
        <ul className="flex flex-col gap-2.5 md:hidden">
          {sorted.map((r) => (
            <li key={r.period.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                  <LotteryFlag lottery={r.period.lottery} />
                  {formatDate(r.period.drawDate)}
                  <span className="text-xs font-normal text-slate-500">{lotteryName[r.period.lottery]}</span>
                </span>
                <Badge tone={r.period.status === "confirmed" ? "green" : "orange"}>{r.period.status === "confirmed" ? "ยืนยันผลแล้ว" : "รอผล"}</Badge>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <Stat label="ยอดขาย"><Amount value={r.totals.purchase} /></Stat>
                <Stat label="เงินรางวัล">{r.profit === null ? <span className="text-slate-400">-</span> : <Amount value={r.totals.prize} />}</Stat>
                <Stat label="กำไร–ขาดทุน">{r.profit === null ? <span className="text-slate-400">-</span> : <Amount value={r.profit} kind="net" />}</Stat>
                <Stat label="ค้างชำระ"><Amount value={r.totals.outstanding} kind="outstanding" /></Stat>
              </dl>
            </li>
          ))}
          <li className="rounded-xl bg-slate-50 p-3">
            <p className="mb-1.5 text-sm font-semibold text-slate-700">รวม</p>
            <dl className="grid grid-cols-2 gap-2 text-sm font-semibold">
              <Stat label="ยอดขาย"><Amount value={totals.purchase} /></Stat>
              <Stat label="เงินรางวัล"><Amount value={totals.prize} /></Stat>
              <Stat label="กำไร–ขาดทุน"><Amount value={totals.profit} kind="net" /></Stat>
              <Stat label="ค้างชำระ"><Amount value={totals.outstanding} kind="outstanding" /></Stat>
            </dl>
          </li>
        </ul>
        </>
      )}
      <p className="mt-2 text-xs text-slate-500">กำไร–ขาดทุนและเงินรางวัลนับเฉพาะงวดที่ยืนยันผลแล้ว (รวม = ผลรวมของงวดที่ยืนยันผลเท่านั้น)</p>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-100">
      <dt className="text-xs font-normal text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
