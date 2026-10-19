"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, Plus, Upload } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { ReportFilters, type DateRange } from "@/components/reports/report-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/state-panels";
import { useDealersData } from "@/hooks/use-dealers-data";
import { downloadCsv } from "@/lib/csv";
import { describeBill, matchesQuery, matchesStatus, resultOf, SORTERS, type SortKey, type StatusFilter } from "@/lib/bills";
import { formatDate, lotteryLabel } from "@/lib/format";
import type { LotteryFilter as LotteryValue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { BillDetailDrawer } from "./bill-detail-drawer";
import { BillDetailPanel } from "./bill-detail-panel";
import { BillKpis, type BillTotals } from "./bill-kpis";
import { BillList, PAGE_SIZE } from "./bill-list";
import { BillToolbar } from "./bill-toolbar";

const OCTOBER: DateRange = { from: "2026-10-01", to: "2026-10-31" };
const SECOND_HALF: DateRange = { from: "2026-10-16", to: "2026-10-31" };

export function BillsPage() {
  const [lottery, setLottery] = useState<LotteryValue>("all");
  const [range, setRange] = useState<DateRange>(OCTOBER);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dealerId, setDealerId] = useState("all");
  const [collectorId, setCollectorId] = useState("all");
  const [nonce, setNonce] = useState(0);

  const data = useDealersData(nonce, () => ({ lottery, periodId: null, ...range }));
  const { dealers, periods, ledger } = data;
  const ready = !!(dealers && periods && ledger);
  const refreshing = data.ledgerLoading && ready;

  const allDates = (periods ?? []).map((p) => p.drawDate).sort();
  const presets = [
    { label: "ตุลาคม 2569", range: OCTOBER },
    { label: "16–31 ต.ค.", range: SECOND_HALF },
    ...(allDates.length ? [{ label: "ทุกงวด", range: { from: allDates[0], to: allDates[allDates.length - 1] } }] : []),
  ];

  const periodMap = new Map((periods ?? []).map((p) => [p.id, p]));
  const dealerList = dealers ?? [];
  const collectorList = (dealerId === "all" ? dealerList : dealerList.filter((d) => d.id === dealerId)).flatMap((d) => d.collectors);
  const scoped = ready
    ? ledger.bills.filter((b) =>
        collectorId !== "all" ? b.collectorId === collectorId : dealerId === "all" || collectorList.some((c) => c.id === b.collectorId),
      )
    : null;
  const all = scoped && dealers ? scoped.map((b) => describeBill(b, dealers, periodMap.get(b.periodId))) : null;

  const totals: BillTotals | null = all && {
    count: all.length,
    amount: all.reduce((s, v) => s + v.bill.amount, 0),
    wonCount: all.filter((v) => resultOf(v) === "won").length,
    prize: all.reduce((s, v) => s + v.bill.prize, 0),
    unpaidCount: all.filter((v) => v.bill.outstanding > 0).length,
    outstanding: all.reduce((s, v) => s + v.bill.outstanding, 0),
  };

  // จำนวนของแต่ละสถานะ นับตามช่อง "ค้นหา" ปัจจุบัน
  const searched = all?.filter((v) => matchesQuery(v, query)) ?? null;
  const counts = searched && {
    all: searched.length,
    paid: searched.filter((v) => matchesStatus(v, "paid")).length,
    unpaid: searched.filter((v) => matchesStatus(v, "unpaid")).length,
    won: searched.filter((v) => matchesStatus(v, "won")).length,
    pending: searched.filter((v) => matchesStatus(v, "pending")).length,
  };
  const filtered = searched ? searched.filter((v) => matchesStatus(v, status)).sort(SORTERS[sort]) : null;

  const total = filtered?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered ? filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : null;
  const openView = all?.find((v) => v.bill.id === openId) ?? null;
  // จอใหญ่: แผงรายละเอียดติดข้างรายการ (ถ้ายังไม่ได้เลือก แสดงบิลแรก) · จอเล็ก: drawer เมื่อแตะบิล
  const docked = useMediaQuery("(min-width: 1280px)");
  const panelView = openView ?? (docked ? visible?.[0] ?? null : null);

  // เปลี่ยนตัวกรองแล้วกลับไปหน้า 1
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  function exportCsv() {
    if (!filtered) return;
    downloadCsv(`lottodesk-bills-${range.from}_${range.to}.csv`, [
      ["เลขบิล", "วันเวลา", "ลูกค้า", "ผู้รวบรวม", "เจ้ามือ", "ประเภทหวย", "งวด", "ยอดซื้อ", "เงินรางวัล", "ค้างชำระ", "ผลรางวัล", "การชำระ"],
      ...filtered.map((v) => [
        v.bill.no,
        v.bill.createdAt,
        v.customer,
        v.collector,
        v.dealer,
        lotteryLabel[v.bill.lottery],
        v.period?.drawDate ?? "",
        v.bill.amount,
        v.bill.prize,
        v.bill.outstanding,
        { won: "ถูกรางวัล", lost: "ไม่ถูก", pending: "รอผล" }[resultOf(v)],
        v.bill.outstanding > 0 ? "ค้างชำระ" : "ชำระแล้ว",
      ]),
    ]);
  }

  return (
    <>
      <TopBar breadcrumb={["รายการบิล"]} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">รายการบิล</h1>
              <Badge tone="orange">ข้อมูลตัวอย่าง</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              ค้นหา ตรวจสอบ และจัดการโพยของลูกค้า · {formatDate(range.from)} – {formatDate(range.to)}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button variant="outline" onClick={exportCsv} disabled={!filtered || total === 0}>
              <Upload /> ส่งออก
            </Button>
            <Button asChild>
              <Link href="/entry"><Plus /> คีย์โพยใหม่</Link>
            </Button>
          </div>
        </div>

        <ReportFilters lottery={lottery} onLotteryChange={reset(setLottery)} range={range} onRangeChange={reset(setRange)} presets={presets}>
          <Select value={dealerId} onValueChange={(v) => { setDealerId(v); setCollectorId("all"); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44" aria-label="เจ้ามือ" />
            <SelectContent>
              <SelectItem value="all">เจ้ามือทั้งหมด</SelectItem>
              {dealerList.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={collectorId} onValueChange={(v) => { setCollectorId(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44" aria-label="ผู้ส่งโพย" />
            <SelectContent>
              <SelectItem value="all">ผู้ส่งโพยทั้งหมด</SelectItem>
              {collectorList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </ReportFilters>

        {data.error ? (
          <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState>
        ) : (
          <div className={cn("flex flex-col gap-4 transition-opacity", refreshing && "pointer-events-none opacity-60")} aria-busy={refreshing}>
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="flex min-w-0 flex-col gap-4">
              <BillKpis totals={totals} />
              <BillToolbar
                status={status}
                onStatus={reset(setStatus)}
                query={query}
                onQuery={reset(setQuery)}
                sort={sort}
                onSort={reset(setSort)}
                counts={counts}
              />
              <BillList
                rows={visible}
                total={total}
                page={currentPage}
                onPage={setPage}
                onOpen={setOpenId}
                selectedId={panelView?.bill.id ?? null}
                filtered={status !== "all" || query.trim() !== ""}
              />
              </div>
              <aside aria-label="รายละเอียดบิล" className="sticky top-[72px] hidden max-h-[calc(100vh-88px)] overflow-y-auto rounded-xl border border-slate-200 bg-white xl:block">
                {panelView ? <BillDetailPanel key={panelView.bill.id} view={panelView} /> : (
                  <p className="p-8 text-center text-sm text-slate-500">{all ? "เลือกบิลเพื่อดูรายละเอียด" : "กำลังโหลด..."}</p>
                )}
              </aside>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500"><Info className="size-4" /> คลิกบิลเพื่อดูรายละเอียด</p>
          </div>
        )}
      </main>

      <BillDetailDrawer view={docked ? null : openView} onClose={() => setOpenId(null)} />
    </>
  );
}
