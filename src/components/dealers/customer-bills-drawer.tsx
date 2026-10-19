"use client";

import { useState } from "react";
import { ToggleGroup } from "radix-ui";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state-panels";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { summarize, type CustomerRow } from "@/lib/calc";
import { formatBaht, formatDate, formatDateTime, formatNumber, lotteryLabel } from "@/lib/format";
import type { Bill, Period } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Amount } from "./amount";
import { BillStatusBadge } from "./bill-badges";
import { LotteryFlag } from "./lottery-flag";

interface Props {
  row: CustomerRow | null;
  bills: Bill[];
  periods: ReadonlyMap<string, Period>;
  collectorName: string;
  onClose: () => void;
}

export function CustomerBillsDrawer({ row, bills, periods, collectorName, onClose }: Props) {
  return (
    <Sheet open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="max-w-2xl bg-slate-50">
        {/* key = รีเซ็ตตัวกรองทุกครั้งที่เปลี่ยนลูกค้า */}
        {row && <DrawerBody key={row.id} row={row} bills={bills} periods={periods} collectorName={collectorName} />}
      </SheetContent>
    </Sheet>
  );
}

type View = "all" | "unpaid" | "prize";

function DrawerBody({ row, bills, periods, collectorName }: Omit<Props, "onClose" | "row"> & { row: CustomerRow }) {
  const [view, setView] = useState<View>("all");
  const { totals } = row;

  const counts = {
    all: bills.length,
    unpaid: bills.filter((b) => b.outstanding > 0).length,
    prize: bills.filter((b) => b.prize > 0).length,
  };
  const shown = bills.filter((b) => (view === "unpaid" ? b.outstanding > 0 : view === "prize" ? b.prize > 0 : true));

  // จัดกลุ่มตามงวด เรียงงวดล่าสุดก่อน
  const groups = [...new Set(shown.map((b) => b.periodId))]
    .map((id) => ({ period: periods.get(id), bills: shown.filter((b) => b.periodId === id) }))
    .sort((a, b) => (b.period?.drawDate ?? "").localeCompare(a.period?.drawDate ?? ""));

  return (
    <>
      <header className="border-b border-slate-200 bg-white p-5 pr-12">
        <div className="flex items-center gap-3">
          <Avatar name={row.name} className="size-12 text-lg" />
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg font-semibold text-slate-900">โพยของ {row.name}</SheetTitle>
            <SheetDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
              <span>รหัส {row.code}</span>
              <span aria-hidden>·</span>
              <span>ผู้รวบรวม {collectorName}</span>
            </SheetDescription>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="ซื้อสุทธิ" hint={totals.pendingPurchase > 0 ? `รอผล ${formatNumber(totals.pendingPurchase)}` : undefined}>
            <Amount value={totals.purchase} />
          </Stat>
          <Stat label="ถูกรางวัล"><Amount value={totals.prize} /></Stat>
          <Stat label="ได้–เสียสุทธิ"><Amount value={totals.netResult} kind="net" /></Stat>
          <Stat label="ค้างชำระ"><Amount value={totals.outstanding} kind="outstanding" /></Stat>
        </dl>
      </header>

      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <ToggleGroup.Root
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as View)}
          aria-label="กรองรายการบิล"
          className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
        >
          {([["all", "ทั้งหมด"], ["unpaid", "ค้างชำระ"], ["prize", "ถูกรางวัล"]] as const).map(([v, label]) => (
            <ToggleGroup.Item
              key={v}
              value={v}
              className="h-7 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
            >
              {label} <span className="tabular-nums opacity-70">({counts[v]})</span>
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
        <p className="text-xs text-slate-500">{shown.length} บิล</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {groups.length === 0 ? (
          <EmptyState
            title={view === "all" ? "ไม่มีบิลในช่วงที่เลือก" : "ไม่มีบิลที่ตรงกับตัวกรอง"}
            hint={view === "all" ? "ลองเปลี่ยนประเภทหวยหรืองวดที่หน้าหลัก" : "ลองเลือก “ทั้งหมด”"}
          />
        ) : (
          groups.map(({ period, bills: list }) => {
            const sub = summarize(list, periods);
            const confirmed = period?.status === "confirmed";
            return (
              <section key={period?.id ?? "?"} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    {period && <LotteryFlag lottery={period.lottery} />}
                    {period ? `${lotteryLabel[period.lottery]} · งวด ${formatDate(period.drawDate)}` : "ไม่ทราบงวด"}
                    <Badge tone={confirmed ? "green" : "neutral"}>{confirmed ? "ยืนยันผลแล้ว" : "รอผล"}</Badge>
                  </div>
                  <span className="text-xs text-slate-500">
                    ซื้อ <Amount value={sub.purchase} className="font-medium" /> บาท
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {list.map((b) => (
                    <li key={b.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="whitespace-nowrap text-sm font-medium text-slate-900">{b.no}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(b.createdAt)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <BillStatusBadge bill={b} />
                          {b.outstanding > 0 && (
                            <span className="text-xs tabular-nums text-orange-600">ค้าง {formatBaht(b.outstanding)}</span>
                          )}
                        </div>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-baseline justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5">
                          <dt className="text-xs text-slate-500">ซื้อ</dt>
                          <dd><Amount value={b.amount} className="font-medium" /></dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5">
                          <dt className="text-xs text-slate-500">รางวัล</dt>
                          <dd>
                            {confirmed ? (
                              <span className={cn("font-medium tabular-nums", b.prize > 0 ? "text-emerald-600" : "text-slate-400")}>
                                {formatNumber(b.prize)}
                              </span>
                            ) : (
                              <span className="text-slate-400">รอผล</span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-500">
        ได้–เสียนับเฉพาะงวดที่ยืนยันผลแล้ว · งวดที่รอผลแสดงแยก ไม่นับในได้–เสีย
      </footer>
    </>
  );
}

function Stat({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-bold">{children}</dd>
      {hint && <p className="text-xs text-orange-600">{hint}</p>}
    </div>
  );
}
