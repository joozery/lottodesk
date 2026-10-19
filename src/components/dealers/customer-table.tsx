"use client";

import { useState } from "react";
import { Popover } from "radix-ui";
import { Eye, Filter, Search } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/state-panels";
import { sumRows, type CustomerRow } from "@/lib/calc";
import { formatNumber } from "@/lib/format";
import { Amount } from "./amount";

interface CustomerTableProps {
  rows: CustomerRow[];
  onView: (customerId: string) => void;
  /** ดัน query เริ่มต้น เช่นมาจากการค้นหาส่วนกลาง */
  initialQuery?: string;
}

export function CustomerTable({ rows, onView, initialQuery = "" }: CustomerTableProps) {
  const [query, setQuery] = useState(initialQuery);
  const [onlyOutstanding, setOnlyOutstanding] = useState(false);
  const [onlyPrize, setOnlyPrize] = useState(false);

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)) &&
      (!onlyOutstanding || r.totals.outstanding > 0) &&
      (!onlyPrize || r.totals.prize > 0),
  );
  const total = sumRows(visible);
  const filtered = q !== "" || onlyOutstanding || onlyPrize;
  const pending = total.pendingPurchase;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อหรือรหัสลูกค้า" className="pl-9" aria-label="ค้นหาลูกค้า" />
        </div>
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button variant={onlyOutstanding || onlyPrize ? "soft" : "outline"}>
              <Filter /> ตัวกรอง
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={6} className="z-50 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <label className="flex items-center gap-2 py-1.5 text-sm text-slate-700">
                <input type="checkbox" checked={onlyOutstanding} onChange={(e) => setOnlyOutstanding(e.target.checked)} />
                เฉพาะที่มียอดค้างชำระ
              </label>
              <label className="flex items-center gap-2 py-1.5 text-sm text-slate-700">
                <input type="checkbox" checked={onlyPrize} onChange={(e) => setOnlyPrize(e.target.checked)} />
                เฉพาะที่ถูกรางวัล
              </label>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="ไม่พบลูกค้า" hint={filtered ? "ลองล้างคำค้นหาหรือตัวกรอง" : "ผู้รวบรวมนี้ยังไม่มีลูกค้าย่อย"} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2.5 pr-3 font-medium">ลูกค้า</th>
                  <th className="py-2.5 pr-3 text-right font-medium">ซื้อสุทธิ</th>
                  <th className="py-2.5 pr-3 text-right font-medium">ถูกรางวัล</th>
                  <th className="py-2.5 pr-3 text-right font-medium">ได้–เสียสุทธิ</th>
                  <th className="py-2.5 pr-3 text-right font-medium">ค้างชำระ</th>
                  <th className="py-2.5 text-right font-medium">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500">รหัส {r.code}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <Amount value={r.totals.purchase} />
                      {r.totals.pendingPurchase > 0 && (
                        <p className="text-xs text-slate-500">รอผล {formatNumber(r.totals.pendingPurchase)}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right"><Amount value={r.totals.prize} /></td>
                    <td className="py-2.5 pr-3 text-right"><Amount value={r.totals.netResult} kind="net" /></td>
                    <td className="py-2.5 pr-3 text-right"><Amount value={r.totals.outstanding} kind="outstanding" /></td>
                    <td className="py-2.5 text-right">
                      <Button variant="soft" size="sm" onClick={() => onView(r.id)}><Eye /> ดูโพย</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="rounded-l-lg px-3 py-3 text-slate-700">{filtered ? "รวม (ที่แสดง)" : "รวม"}</td>
                  <td className="py-2.5 pr-3 text-right"><Amount value={total.purchase} /></td>
                  <td className="py-2.5 pr-3 text-right"><Amount value={total.prize} /></td>
                  <td className="py-2.5 pr-3 text-right"><Amount value={total.netResult} kind="net" /></td>
                  <td className="py-2.5 pr-3 text-right"><Amount value={total.outstanding} kind="outstanding" /></td>
                  <td className="rounded-r-lg" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {visible.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{r.name}</p>
                    <p className="text-xs text-slate-500">รหัส {r.code}</p>
                  </div>
                  <Button variant="soft" size="sm" onClick={() => onView(r.id)}><Eye /> ดูโพย</Button>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-slate-500">ซื้อสุทธิ</dt><dd className="text-right"><Amount value={r.totals.purchase} /></dd>
                  <dt className="text-slate-500">ถูกรางวัล</dt><dd className="text-right"><Amount value={r.totals.prize} /></dd>
                  <dt className="text-slate-500">ได้–เสียสุทธิ</dt><dd className="text-right"><Amount value={r.totals.netResult} kind="net" /></dd>
                  <dt className="text-slate-500">ค้างชำระ</dt><dd className="text-right"><Amount value={r.totals.outstanding} kind="outstanding" /></dd>
                </dl>
              </li>
            ))}
            <li className="rounded-xl bg-slate-50 p-3 text-sm font-semibold">
              <div className="flex justify-between"><span>ซื้อสุทธิ</span><Amount value={total.purchase} /></div>
              <div className="flex justify-between"><span>รางวัล</span><Amount value={total.prize} /></div>
              <div className="flex justify-between"><span>ได้–เสีย</span><Amount value={total.netResult} kind="net" /></div>
              <div className="flex justify-between"><span>ค้าง</span><Amount value={total.outstanding} kind="outstanding" /></div>
            </li>
          </ul>
        </>
      )}

      <div className="space-y-0.5 text-xs text-slate-500">
        <p>ได้–เสียเฉพาะงวดที่ยืนยันผลแล้ว</p>
        {pending > 0 && <p className="text-orange-600">มียอดรอผล {formatNumber(pending)} บาท — แสดงแยก ไม่นับในได้–เสีย</p>}
      </div>
    </div>
  );
}
