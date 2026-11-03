"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Plus } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { ReportFilters, type DateRange } from "@/components/reports/report-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/state-panels";
import { useDealersData } from "@/hooks/use-dealers-data";
import { useRemote } from "@/hooks/use-remote";
import { bangkokDate, formatBaht, formatDate } from "@/lib/format";
import { debtorRows, type DebtorRow } from "@/lib/report";
import type { LotteryFilter as LotteryValue, Payment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fetchOutstanding, fetchPayments } from "@/services/payments-service";
import { PaymentDialog, type PaymentDefaults } from "./payment-dialog";
import { PaymentKpis } from "./payment-kpis";
import { PaymentTable } from "./payment-table";
import { ReceivablesCard } from "./receivables-card";

interface DialogState {
  direction: "in" | "out";
  defaults: PaymentDefaults;
}

function currentMonthRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`,
  };
}

export function PaymentsPage() {
  const [lottery, setLottery] = useState<LotteryValue>("all");
  const [periodId, setPeriodId] = useState("all");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });
  const [nonce, setNonce] = useState(0);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // Next.js ห้ามอ่านเวลาปัจจุบันระหว่าง prerender ของ Client Component
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRange(currentMonthRange());
  }, []);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("lottery");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านค่าตัวกรองจาก URL หลัง hydration
    if (value === "thai" || value === "lao") setLottery(value);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payPrize = params.get("payPrize") === "1";
    if (params.get("receive") !== "1" && !payPrize) return;
    const collectorId = params.get("collectorId") ?? undefined;
    const customerId = params.get("customerId") ?? undefined;
    const billId = params.get("billId") ?? undefined;
    const amount = Number(params.get("amount"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- เปิดฟอร์มรับเงินจากลิงก์ที่ส่งมาจากบิล
    setDialog({ direction: payPrize ? "out" : "in", defaults: { collectorId, customerId, billId, amount: Number.isFinite(amount) && amount > 0 ? amount : undefined, note: payPrize ? "จ่ายเงินรางวัล" : undefined } });
    window.history.replaceState({}, "", "/payments");
  }, []);

  const data = useDealersData(nonce, () => range.from && range.to ? ({ lottery, periodId: periodId === "all" ? null : periodId, ...range }) : null);
  const payments = useRemote(`payments-${nonce}-${lottery}-${range.from}-${range.to}`, range.from && range.to ? () => fetchPayments({ lottery, ...range }) : null, { keepPrevious: true });
  const outstanding = useRemote(`outstanding-${nonce}`, fetchOutstanding);

  const { dealers, periods, ledger } = data;
  const allDates = (periods ?? []).map((p) => p.drawDate).sort();
  const presets = [
    ...(allDates.length ? [{ label: "ทุกงวด", range: { from: allDates[0], to: allDates[allDates.length - 1] } }] : []),
  ];
  const periodOptions = (periods ?? [])
    .filter((p) => lottery === "all" || p.lottery === lottery)
    .sort((a, b) => b.drawDate.localeCompare(a.drawDate));
  const ready = !!(dealers && periods && ledger && payments.data);
  const refreshing = ready && (data.ledgerLoading || payments.loading);
  const failed = data.error || payments.error || outstanding.error;

  const list = payments.data;
  const totals = ready
    ? {
        received: list!.filter((p) => p.direction === "in").reduce((s, p) => s + p.amount, 0),
        paid: list!.filter((p) => p.direction === "out").reduce((s, p) => s + p.amount, 0),
        outstanding: ledger!.bills.reduce((s, b) => s + b.outstanding, 0),
      }
    : null;
  const receivables = ready ? debtorRows(dealers!, ledger!.bills) : null;

  const openDialog = (direction: "in" | "out", defaults: PaymentDefaults = {}) => setDialog({ direction, defaults });
  const receive = (r: DebtorRow) =>
    openDialog("in", { collectorId: r.collectorId, customerId: r.customerId ?? undefined, amount: r.amount });

  function saved(p: Payment) {
    const day = bangkokDate(p.at);
    // ถ้ารายการที่บันทึกอยู่นอกช่วงที่ดู ให้ขยายช่วงให้เห็นรายการนั้น
    setRange((r) => ({ from: day < r.from ? day : r.from, to: day > r.to ? day : r.to }));
    setNotice(
      `${p.direction === "in" ? "บันทึกรับเงิน" : "บันทึกจ่ายเงิน"} ${formatBaht(p.amount)} แล้ว` +
        (p.direction === "in" && p.customerId ? " และหักยอดค้างชำระของลูกค้าแล้ว" : ""),
    );
    setNonce((n) => n + 1);
  }

  const canRecord = !!(dealers && outstanding.data);

  return (
    <>
      <TopBar breadcrumb={["รับ–จ่ายเงิน"]} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">รับ–จ่ายเงิน</h1>
              <Badge tone="orange">ข้อมูลตัวอย่าง</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              บันทึกและติดตามเงินรับ–จ่าย ช่วง {formatDate(range.from)} – {formatDate(range.to)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!canRecord} onClick={() => openDialog("out")}>
              <ArrowLeftRight /> บันทึกจ่ายเงิน
            </Button>
            <Button disabled={!canRecord} onClick={() => openDialog("in")}>
              <Plus /> บันทึกรับเงิน
            </Button>
          </div>
        </div>

        <ReportFilters lottery={lottery} onLotteryChange={(value) => { setLottery(value); setPeriodId("all"); }} range={range} onRangeChange={setRange} presets={presets}>
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-full sm:w-44" aria-label="งวด" />
            <SelectContent>
              <SelectItem value="all">ทุกงวด</SelectItem>
              {periodOptions.map((period) => <SelectItem key={period.id} value={period.id}>{formatDate(period.drawDate)} · {period.lottery === "thai" ? "หวยไทย" : "หวยลาว"}</SelectItem>)}
            </SelectContent>
          </Select>
        </ReportFilters>

        {notice && (
          <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>{notice}</span>
            <button type="button" className="shrink-0 text-emerald-700 underline" onClick={() => setNotice(null)}>ปิด</button>
          </div>
        )}

        {failed ? (
          <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState>
        ) : (
          <div className={cn("flex flex-col gap-4 transition-opacity", refreshing && "pointer-events-none opacity-60")} aria-busy={refreshing}>
            <PaymentKpis totals={totals} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <PaymentTable payments={ready ? list : null} dealers={dealers} />
              <ReceivablesCard rows={receivables} onReceive={receive} />
            </div>
          </div>
        )}
      </main>

      {dialog && dealers && outstanding.data && (
        <PaymentDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          direction={dialog.direction}
          dealers={dealers}
          outstanding={outstanding.data}
          defaults={dialog.defaults}
          lottery={lottery === "all" ? "thai" : lottery}
          onSaved={saved}
        />
      )}
    </>
  );
}
