"use client";

import { useState } from "react";
import { Search } from "@/components/icons";
import { Amount } from "@/components/dealers/amount";
import { BillStatusBadge } from "@/components/dealers/bill-badges";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import type { PrizeResult } from "@/lib/prize";
import { BET_LABEL, RATES, linePrize } from "@/lib/prize-calc";
import type { Bill, Dealer } from "@/lib/types";

interface Row {
  bill: Bill;
  hits: string[];
  customer: string;
  collector: string;
  dealer: string;
}

function buildRows(bills: Bill[], dealers: Dealer[], result: PrizeResult | null): Row[] {
  return bills
    .filter((b) => b.prize > 0)
    .map((bill) => {
      const dealer = dealers.find((d) => d.collectors.some((c) => c.id === bill.collectorId));
      const collector = dealer?.collectors.find((c) => c.id === bill.collectorId);
      const customer = collector?.customers.find((c) => c.id === bill.customerId);
      const hits = result
        ? bill.lines
            .filter((l) => linePrize(l, bill.lottery, result, bill.rates) > 0)
            .map((l) => `${BET_LABEL[l.type]} ${l.number} (${formatNumber(l.amount)} × ${(bill.rates ?? RATES)[l.type]})`)
        : [];
      return {
        bill,
        hits,
        customer: customer?.name ?? `${collector?.name ?? "-"} (โพยตัวเอง)`,
        collector: collector?.name ?? "-",
        dealer: dealer?.name ?? "-",
      };
    })
    .sort((a, b) => b.bill.prize - a.bill.prize);
}

interface Props {
  result: PrizeResult | null;
  dealers: Dealer[] | null;
  bills: Bill[] | null;
  /** งวดยังไม่ประกาศผล */
  pending: boolean;
}

export function WinnersTable({ result, dealers, bills, pending }: Props) {
  const [query, setQuery] = useState("");
  const rows = dealers && bills ? buildRows(bills, dealers, result) : null;
  const q = query.trim().toLowerCase();
  const visible = rows?.filter((r) => !q || r.customer.toLowerCase().includes(q) || r.bill.no.toLowerCase().includes(q) || r.dealer.toLowerCase().includes(q));
  const total = visible?.reduce((s, r) => s + r.bill.prize, 0) ?? 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">บิลที่ถูกรางวัล{rows && !pending ? ` (${rows.length})` : ""}</h3>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาลูกค้า เลขบิล เจ้ามือ" className="pl-9" aria-label="ค้นหาบิลที่ถูกรางวัล" />
        </div>
      </div>

      {!visible ? (
        <Skeleton className="h-40" />
      ) : pending ? (
        <EmptyState title="ยังไม่ประกาศผลรางวัล" hint="รายชื่อผู้ถูกรางวัลจะแสดงหลังบันทึกและยืนยันผล" />
      ) : visible.length === 0 ? (
        <EmptyState title={q ? "ไม่พบบิลที่ค้นหา" : "งวดนี้ไม่มีบิลที่ถูกรางวัล"} hint={q ? "ลองค้นหาด้วยคำอื่น" : undefined} />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2.5 pr-3 font-medium">เลขบิล</th>
                  <th className="py-2.5 pr-3 font-medium">ลูกค้า</th>
                  <th className="py-2.5 pr-3 font-medium">เลขที่ถูก</th>
                  <th className="py-2.5 pr-3 font-medium">เจ้ามือ → ผู้รวบรวม</th>
                  <th className="py-2.5 pr-3 text-right font-medium">ยอดซื้อ</th>
                  <th className="py-2.5 pr-3 text-right font-medium">เงินรางวัล</th>
                  <th className="py-2.5 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.bill.id} className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-3 pr-3 font-medium text-slate-800">{r.bill.no}</td>
                    <td className="py-3 pr-3 text-slate-900">{r.customer}</td>
                    <td className="py-3 pr-3 text-slate-700">
                      {r.hits.map((h) => <p key={h} className="whitespace-nowrap">{h}</p>)}
                    </td>
                    <td className="py-3 pr-3 text-slate-600">{r.dealer} → {r.collector}</td>
                    <td className="py-3 pr-3 text-right"><Amount value={r.bill.amount} /></td>
                    <td className="py-3 pr-3 text-right font-semibold"><Amount value={r.bill.prize} className="text-emerald-600" /></td>
                    <td className="py-3"><BillStatusBadge bill={r.bill} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={5} className="rounded-l-lg px-3 py-3 text-slate-700">รวมเงินรางวัล{q ? " (ที่แสดง)" : ""}</td>
                  <td className="py-3 pr-3 text-right"><Amount value={total} className="text-emerald-600" /></td>
                  <td className="rounded-r-lg" />
                </tr>
              </tfoot>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {visible.map((r) => (
              <li key={r.bill.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{r.customer}</p>
                    <p className="text-xs text-slate-500">{r.bill.no} · {r.dealer} → {r.collector}</p>
                  </div>
                  <BillStatusBadge bill={r.bill} />
                </div>
                {r.hits.length > 0 && <p className="mt-1.5 text-xs text-slate-600">{r.hits.join(" · ")}</p>}
                <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between rounded-md bg-slate-50 px-2.5 py-1.5"><dt className="text-xs text-slate-500">ซื้อ</dt><dd><Amount value={r.bill.amount} /></dd></div>
                  <div className="flex justify-between rounded-md bg-slate-50 px-2.5 py-1.5"><dt className="text-xs text-slate-500">รางวัล</dt><dd><Amount value={r.bill.prize} className="font-semibold text-emerald-600" /></dd></div>
                </dl>
              </li>
            ))}
            <li className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-semibold">
              <span>รวมเงินรางวัล</span><Amount value={total} className="text-emerald-600" />
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
