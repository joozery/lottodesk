import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Amount } from "@/components/dealers/amount";
import { LotteryFlag } from "@/components/dealers/lottery-flag";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime, formatNumber, formatTime, lotteryLabel } from "@/lib/format";
import type { BillView } from "@/lib/bills";
import { cn } from "@/lib/utils";
import { PaymentBadge, ResultBadge } from "./bill-badges";

export const PAGE_SIZE = 10;

interface Props {
  rows: BillView[] | null;
  /** จำนวนบิลทั้งหมดก่อนแบ่งหน้า */
  total: number;
  page: number;
  onPage: (p: number) => void;
  onOpen: (billId: string) => void;
  /** บิลที่กำลังดูรายละเอียด (ไฮไลต์แถว) */
  selectedId: string | null;
  filtered: boolean;
}

export function BillList({ rows, total, page, onPage, onOpen, selectedId, filtered }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 max-md:border-0 max-md:bg-transparent max-md:p-0">
      {!rows ? (
        <Skeleton className="h-72" />
      ) : total === 0 ? (
        <EmptyState title={filtered ? "ไม่พบบิลที่ตรงกับตัวกรอง" : "ไม่มีบิลในช่วงที่เลือก"} hint="ลองขยายช่วงวันที่ หรือล้างตัวกรอง" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="rounded-l-lg px-3 py-2.5 font-medium">เลขบิล</th>
                  <th className="px-3 py-2.5 font-medium">ลูกค้า</th>
                  <th className="px-3 py-2.5 font-medium">ประเภทหวย</th>
                  <th className="px-3 py-2.5 text-right font-medium">ยอดสุทธิ</th>
                  <th className="px-3 py-2.5 font-medium">สถานะ</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right font-medium">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr
                    key={v.bill.id}
                    aria-selected={v.bill.id === selectedId}
                    className={cn("cursor-pointer border-b border-slate-100 hover:bg-slate-50", v.bill.id === selectedId && "bg-blue-100/70 hover:bg-blue-100/70")}
                    onClick={() => onOpen(v.bill.id)}
                  >
                    <td className="whitespace-nowrap px-3 py-3">
                      <button type="button" className="font-medium text-slate-900 hover:underline" onClick={(e) => { e.stopPropagation(); onOpen(v.bill.id); }}>
                        {v.bill.no}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900">{v.customer}</p>
                      <p className="text-xs text-slate-500">{v.collector}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="inline-flex items-center gap-2 text-slate-800">
                        <LotteryFlag lottery={v.bill.lottery} className="text-base" />
                        {lotteryLabel[v.bill.lottery]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right"><Amount value={v.bill.amount} className="font-medium" /></td>
                    <td className="px-3 py-3">
                      <PaymentBadge bill={v.bill} />
                      {v.bill.outstanding > 0 && <p className="mt-0.5 text-xs font-semibold text-orange-600">ค้าง {formatNumber(v.bill.outstanding)}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-600">{formatTime(v.bill.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-2.5 md:hidden">
            {rows.map((v) => (
              <li key={v.bill.id}>
                <button type="button" onClick={() => onOpen(v.bill.id)} className="w-full rounded-xl border border-slate-200 p-3 text-left active:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{v.customer}</p>
                      <p className="text-xs text-slate-500">{v.bill.no} · {formatDateTime(v.bill.createdAt)}</p>
                    </div>
                    <Amount value={v.bill.amount} className="shrink-0 text-base font-semibold" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <LotteryFlag lottery={v.bill.lottery} />
                      {v.period ? formatDate(v.period.drawDate) : "-"}
                    </span>
                    <ResultBadge view={v} />
                    <PaymentBadge bill={v.bill} />
                    {v.bill.prize > 0 && <span className="text-xs font-semibold text-emerald-600">รางวัล {formatNumber(v.bill.prize)}</span>}
                    {v.bill.outstanding > 0 && <span className="text-xs font-semibold text-orange-600">ค้าง {formatNumber(v.bill.outstanding)}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm text-slate-500">
            <span>แสดง {formatNumber(from)}–{formatNumber(to)} จาก {formatNumber(total)} บิล</span>
            {pageCount > 1 && (
              <nav aria-label="เลือกหน้า" className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft /></Button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <Button key={n} size="sm" variant={n === page ? "default" : "ghost"} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)} className="min-w-8 tabular-nums">
                    {n}
                  </Button>
                ))}
                <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="หน้าถัดไป"><ChevronRight /></Button>
              </nav>
            )}
          </div>
        </>
      )}
    </section>
  );
}
