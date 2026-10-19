"use client";

import { useState } from "react";
import { ToggleGroup } from "radix-ui";
import { Search } from "@/components/icons";
import { Amount } from "@/components/dealers/amount";
import { LotteryFlag } from "@/components/dealers/lottery-flag";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import type { Dealer, Payment } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "all" | "in" | "out";

function resolveNames(p: Payment, dealers: Dealer[]) {
  const dealer = dealers.find((d) => d.collectors.some((c) => c.id === p.collectorId));
  const collector = dealer?.collectors.find((c) => c.id === p.collectorId);
  const customer = collector?.customers.find((c) => c.id === p.customerId);
  return { dealer: dealer?.name ?? "-", collector: collector?.name ?? "-", customer: customer?.name ?? null };
}

const DirectionBadge = ({ p }: { p: Payment }) =>
  p.direction === "in" ? <Badge tone="green">รับเงิน</Badge> : <Badge tone="neutral">จ่ายเงิน</Badge>;

const Signed = ({ p }: { p: Payment }) => (
  <span className={cn("font-semibold tabular-nums", p.direction === "in" ? "text-emerald-600" : "text-red-600")}>
    <Amount value={p.amount} className="text-inherit" />
  </span>
);

export function PaymentTable({ payments, dealers }: { payments: Payment[] | null; dealers: Dealer[] | null }) {
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");

  const rows = payments && dealers ? payments.map((p) => ({ p, ...resolveNames(p, dealers) })) : null;
  const q = query.trim().toLowerCase();
  const visible = rows?.filter(
    ({ p, collector, customer }) =>
      (view === "all" || p.direction === view) &&
      (!q || p.note.toLowerCase().includes(q) || collector.toLowerCase().includes(q) || (customer ?? "").toLowerCase().includes(q)),
  );
  const count = (v: View) => rows?.filter(({ p }) => v === "all" || p.direction === v).length ?? 0;
  const net = visible?.reduce((s, { p }) => s + (p.direction === "in" ? p.amount : -p.amount), 0) ?? 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">รายการรับ–จ่าย</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup.Root
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as View)}
            aria-label="กรองรับ–จ่าย"
            className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
          >
            {([["all", "ทั้งหมด"], ["in", "รับเงิน"], ["out", "จ่ายเงิน"]] as const).map(([v, label]) => (
              <ToggleGroup.Item
                key={v}
                value={v}
                className="h-7 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
              >
                {label} <span className="tabular-nums opacity-70">({count(v)})</span>
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
          <div className="relative w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหารายการ ชื่อ" className="pl-9" aria-label="ค้นหารายการรับ–จ่าย" />
          </div>
        </div>
      </div>

      {!visible ? (
        <Skeleton className="h-48" />
      ) : visible.length === 0 ? (
        <EmptyState title={q || view !== "all" ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ไม่มีรายการรับ–จ่ายในช่วงที่เลือก"} hint="ลองขยายช่วงวันที่หรือเปลี่ยนตัวกรอง" />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2.5 pr-3 font-medium">เวลา</th>
                  <th className="py-2.5 pr-3 font-medium">รายการ</th>
                  <th className="py-2.5 pr-3 font-medium">เจ้ามือ → ผู้รวบรวม</th>
                  <th className="py-2.5 pr-3 font-medium">ประเภท</th>
                  <th className="py-2.5 pr-3 font-medium">รับ/จ่าย</th>
                  <th className="py-2.5 text-right font-medium">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ p, dealer, collector, customer }) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-slate-600">{formatDateTime(p.at)}</td>
                    <td className="py-2.5 pr-3">
                      <p className="text-slate-900">{p.note}</p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        {customer && <span>ลูกค้า {customer}</span>}
                        {p.recorded && <Badge tone="blue" className="px-1.5 py-0 text-[11px]">บันทึกเอง</Badge>}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{dealer} → {collector}</td>
                    <td className="py-2.5 pr-3"><LotteryFlag lottery={p.lottery} className="text-base" /></td>
                    <td className="py-2.5 pr-3"><DirectionBadge p={p} /></td>
                    <td className="py-2.5 text-right"><Signed p={p} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={5} className="rounded-l-lg px-3 py-2.5 text-slate-700">เงินสุทธิ (รับ − จ่าย){q || view !== "all" ? " ของรายการที่แสดง" : ""}</td>
                  <td className="rounded-r-lg py-2.5 text-right"><Amount value={net} kind="net" /></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {visible.map(({ p, collector, customer }) => (
              <li key={p.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900">{p.note}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(p.at)} · {customer ?? collector}</p>
                  </div>
                  <DirectionBadge p={p} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <LotteryFlag lottery={p.lottery} className="text-base" />
                  <Signed p={p} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
