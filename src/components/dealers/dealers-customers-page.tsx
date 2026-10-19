"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ErrorState } from "@/components/ui/state-panels";
import { useDealersData } from "@/hooks/use-dealers-data";
import { customerRows, groupSummary } from "@/lib/calc";
import { cn } from "@/lib/utils";
import { defaultPeriodId } from "@/lib/period";
import type { LotteryFilter as LotteryValue } from "@/lib/types";
import { CollectorProfile } from "./collector-profile";
import { CustomerBillsDrawer } from "./customer-bills-drawer";
import { CustomerTabs } from "./customer-tabs";
import { DealerTree } from "./dealer-tree";
import { AddCustomerDialog, EditCollectorDialog, NewBillDialog } from "./entity-dialogs";
import { FinancialSummaryCards } from "./financial-summary-cards";
import { GroupSummary } from "./group-summary";
import { LotteryFilter } from "./lottery-filter";
import { PeriodFilter } from "./period-filter";
import { RecentActivity } from "./recent-activity";
import { RecentBills } from "./recent-bills";

const DEFAULT_RANGE = { from: "2026-10-01", to: "2026-10-31" };

export function DealersCustomersPage() {
  const [lottery, setLottery] = useState<LotteryValue>("thai");
  const [periodChoice, setPeriodChoice] = useState<string | null>(null);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [nonce, setNonce] = useState(0);

  const [selectedCollectorId, setSelectedCollectorId] = useState("c-a");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(["d-bank"]));
  const [dealerQuery, setDealerQuery] = useState("");

  const [treeOpen, setTreeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);

  const data = useDealersData(nonce, (all) => {
    if (lottery === "all") return { lottery, periodId: null, ...range };
    // งวดที่ใช้จริง: ตัวเลือกของผู้ใช้ ถ้าไม่ตรงประเภทหวย ใช้งวดเริ่มต้น
    const valid = all.some((p) => p.id === periodChoice && p.lottery === lottery);
    const periodId = valid ? periodChoice : defaultPeriodId(all, lottery);
    return periodId ? { lottery, periodId, ...range } : null;
  });
  const effectivePeriodId = data.filter?.periodId ?? null;

  const { dealers, periods, ledger } = data;
  const periodMap = new Map((periods ?? []).map((p) => [p.id, p]));

  const owner = dealers?.find((d) => d.collectors.some((c) => c.id === selectedCollectorId)) ?? dealers?.[0];
  const selection = owner
    ? { dealer: owner, collector: owner.collectors.find((c) => c.id === selectedCollectorId) ?? owner.collectors[0] }
    : null;

  const bills = ledger?.bills ?? null;
  const summary = selection && bills ? groupSummary(selection.collector.id, bills, periodMap) : null;
  const rows = selection && bills ? customerRows(selection.collector, bills, periodMap) : null;
  const groupBills = selection && bills ? bills.filter((b) => b.collectorId === selection.collector.id) : [];
  const customerNames = new Map((selection?.collector.customers ?? []).map((c) => [c.id, c.name]));

  const selectCollector = (collectorId: string, customerId?: string) => {
    setSelectedCollectorId(collectorId);
    const owner = dealers?.find((d) => d.collectors.some((c) => c.id === collectorId));
    if (owner) setExpanded((s) => new Set(s).add(owner.id));
    setTreeOpen(false);
    setViewCustomerId(customerId ?? null);
  };

  const toggleDealer = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const changeLottery = (next: LotteryValue) => {
    setLottery(next);
    setPeriodChoice(null);
  };

  const tree = (
    <DealerTree
      dealers={dealers}
      bills={bills}
      query={dealerQuery}
      onQueryChange={setDealerQuery}
      expanded={expanded}
      onToggle={toggleDealer}
      selectedCollectorId={selection?.collector.id ?? selectedCollectorId}
      onSelect={selectCollector}
    />
  );

  const viewRow = rows?.find((r) => r.id === viewCustomerId) ?? null;
  // skeleton เฉพาะตอนยังไม่เคยมีข้อมูล; โหลดซ้ำจากการเปลี่ยนตัวกรอง แสดงข้อมูลเดิมแบบจางๆ
  const detailLoading = data.baseLoading || !ledger;
  const refreshing = data.ledgerLoading && !!ledger;

  return (
    <>
        <TopBar
          breadcrumb={["เจ้ามือและลูกค้า", ...(selection ? [selection.dealer.name, selection.collector.name] : [])]}
          dealers={dealers}
          onPick={selectCollector}
        />

        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-5">
          {/* ส่วนหัวหน้า */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">เจ้ามือและลูกค้า</h1>
                <Badge tone="orange">ข้อมูลตัวอย่าง</Badge>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">จัดการเจ้ามือและลูกค้า แยกตามประเภทหวยและงวด</p>
            </div>
            <Button onClick={() => setBillOpen(true)} disabled={!dealers || !periods}>
              <Plus /> คีย์โพยใหม่
            </Button>
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <LotteryFilter value={lottery} onChange={changeLottery} />
            <PeriodFilter
              lottery={lottery}
              periods={periods ?? []}
              periodId={effectivePeriodId}
              onPeriodChange={setPeriodChoice}
              from={range.from}
              to={range.to}
              onRangeChange={(from, to) => setRange({ from, to })}
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden xl:block">{tree}</aside>

            <div className="flex min-w-0 flex-col gap-4">
              <Button variant="outline" className="h-auto justify-between py-2.5 xl:hidden" onClick={() => setTreeOpen(true)}>
                <span>เจ้ามือ: {selection ? `${selection.dealer.name} → ${selection.collector.name}` : "กำลังโหลด..."}</span>
                <ChevronDown />
              </Button>

              {data.error ? (
                <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState>
              ) : (
                <div className={cn("flex flex-col gap-4 transition-opacity", refreshing && "pointer-events-none opacity-60")} aria-busy={refreshing}>
                  {selection && (
                    <CollectorProfile
                      dealer={selection.dealer}
                      collector={selection.collector}
                      lottery={lottery}
                      onEdit={() => setEditOpen(true)}
                      onAddCustomer={() => setAddOpen(true)}
                    />
                  )}
                  <GroupSummary summary={detailLoading ? null : summary} />
                  <FinancialSummaryCards summary={detailLoading ? null : summary} payerName={selection?.collector.name ?? "-"} />
                  <CustomerTabs
                    rows={detailLoading ? null : rows}
                    customerCount={selection?.collector.customers.length ?? 0}
                    ownBills={groupBills.filter((b) => b.customerId === null)}
                    payments={(ledger?.payments ?? []).filter((p) => p.collectorId === selection?.collector.id)}
                    periods={periodMap}
                    collectorName={selection?.collector.name ?? ""}
                    onViewCustomer={setViewCustomerId}
                    key={selection?.collector.id}
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <RecentActivity loading={detailLoading} activities={(ledger?.activities ?? []).filter((a) => a.collectorId === selection?.collector.id).slice(0, 4)} />
                    <RecentBills loading={detailLoading} bills={groupBills} periods={periodMap} customerNames={customerNames} collectorName={selection?.collector.name ?? ""} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

      {/* Drawer เลือกเจ้ามือ สำหรับจอเล็ก */}
      <Sheet open={treeOpen} onOpenChange={setTreeOpen}>
        <SheetContent side="left">
          <SheetTitle className="sr-only">เลือกเจ้ามือ</SheetTitle>
          <SheetDescription className="sr-only">เลือกเจ้ามือและผู้รวบรวมโพย</SheetDescription>
          <div className="overflow-y-auto p-5 pt-10">{tree}</div>
        </SheetContent>
      </Sheet>

      <CustomerBillsDrawer
        row={viewRow}
        bills={groupBills.filter((b) => b.customerId === viewCustomerId)}
        periods={periodMap}
        collectorName={selection?.collector.name ?? ""}
        onClose={() => setViewCustomerId(null)}
      />

      {selection && dealers && periods && (
        <>
          <EditCollectorDialog open={editOpen} onOpenChange={setEditOpen} collector={selection.collector} />
          <AddCustomerDialog open={addOpen} onOpenChange={setAddOpen} collector={selection.collector} />
          <NewBillDialog
            open={billOpen}
            onOpenChange={setBillOpen}
            dealers={dealers}
            periods={periods}
            dealerId={selection.dealer.id}
            collectorId={selection.collector.id}
            lottery={lottery === "all" ? "thai" : lottery}
            periodId={lottery === "all" ? null : effectivePeriodId}
          />
        </>
      )}
    </>
  );
}
