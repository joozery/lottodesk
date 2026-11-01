import { Fragment, useState } from "react";
import { EmptyState } from "@/components/ui/state-panels";
import { Button } from "@/components/ui/button";
import { Printer } from "@/components/icons";
import { formatDate, formatNumber, lotteryLabel } from "@/lib/format";
import type { BillView } from "@/lib/bills";
import { BET_LABEL } from "@/lib/prize-calc";

export function GroupedBillList({ rows, filtered, onSelectGroup }: { rows: BillView[] | null; filtered: boolean; onSelectGroup?: (rows: BillView[]) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!rows) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">กำลังโหลด...</div>;
  if (!rows.length) return <div className="rounded-xl border border-slate-200 bg-white"><EmptyState title={filtered ? "ไม่พบกลุ่มบิลที่ตรงกับตัวกรอง" : "ไม่มีบิลในช่วงที่เลือก"} hint="ลองขยายช่วงวันที่ หรือล้างตัวกรอง" /></div>;
  const groups = new Map<string, { collector: string; period: string; lottery: BillView["bill"]["lottery"]; count: number; customers: Set<string>; gross: number; amount: number; outstanding: number; bills: BillView[] }>();
  for (const row of rows) {
    const key = `${row.bill.collectorId}|${row.bill.periodId}`;
    const group = groups.get(key) ?? { collector: row.collector, period: row.period?.drawDate ?? "-", lottery: row.bill.lottery, count: 0, customers: new Set<string>(), gross: 0, amount: 0, outstanding: 0, bills: [] };
    group.count += 1;
    group.customers.add(row.customer);
    group.gross += row.bill.grossAmount ?? row.bill.amount;
    group.amount += row.bill.amount;
    group.outstanding += row.bill.outstanding;
    group.bills.push(row);
    groups.set(key, group);
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-3.5"><div className="mb-2 text-xs text-slate-500">กดแถวเพื่อดูสรุปด้านขวาและกางบิลทั้งหมดในกลุ่ม</div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="bg-slate-50 text-left text-slate-600"><th className="rounded-l-lg px-3 py-2.5 font-medium">ลูกค้าหลัก / งวด</th><th className="px-3 py-2.5 font-medium">ประเภทหวย</th><th className="px-3 py-2.5 text-right font-medium">จำนวนบิล</th><th className="px-3 py-2.5 text-right font-medium">ยอดก่อนลด</th><th className="px-3 py-2.5 text-right font-medium">ยอดสุทธิ</th><th className="rounded-r-lg px-3 py-2.5 text-right font-medium">ค้างชำระ</th></tr></thead><tbody>{[...groups.entries()].map(([key, group]) => <Fragment key={key}><tr className="cursor-pointer border-b border-slate-100 hover:bg-blue-50" onClick={() => { onSelectGroup?.(group.bills); setExpanded((current) => current === key ? null : key); }}><td className="px-3 py-3"><p className="font-medium text-slate-900">{expanded === key ? "▼ " : "▶ "}{group.collector}</p><p className="text-xs text-slate-500">งวด {formatDate(group.period)} · {group.customers.size} ลูกค้าย่อย</p></td><td className="px-3 py-3">{lotteryLabel[group.lottery]}</td><td className="px-3 py-3 text-right tabular-nums">{formatNumber(group.count)}</td><td className="px-3 py-3 text-right tabular-nums">{formatNumber(group.gross)} บาท</td><td className="px-3 py-3 text-right font-medium tabular-nums">{formatNumber(group.amount)} บาท</td><td className="px-3 py-3 text-right tabular-nums">{group.outstanding ? `${formatNumber(group.outstanding)} บาท` : "-"}</td></tr>{expanded === key && group.bills.map((row) => <tr key={row.bill.id} className="border-b border-slate-100 bg-slate-50 text-xs"><td className="py-2 pl-8 pr-3">{row.bill.no} · {row.customer}</td><td className="px-3 py-2">{lotteryLabel[row.bill.lottery]}</td><td className="px-3 py-2 text-right">1 บิล</td><td className="px-3 py-2 text-right">{formatNumber(row.bill.grossAmount ?? row.bill.amount)} บาท</td><td className="px-3 py-2 text-right">{formatNumber(row.bill.amount)} บาท</td><td className="px-3 py-2 text-right">{row.bill.outstanding ? `${formatNumber(row.bill.outstanding)} บาท` : "-"}</td></tr>)}</Fragment>)}</tbody></table></div></section>;
}

export function GroupedBillDetail({ rows }: { rows: BillView[] }) {
  const first = rows[0];
  if (!first) return null;
  const gross = rows.reduce((sum, row) => sum + (row.bill.grossAmount ?? row.bill.amount), 0);
  const amount = rows.reduce((sum, row) => sum + row.bill.amount, 0);
  const outstanding = rows.reduce((sum, row) => sum + row.bill.outstanding, 0);
  function printGroup() {
    const popup = window.open("", "_blank", "width=800,height=900");
    if (!popup) return;
    const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
    const lines = rows.flatMap((row) => row.bill.lines.map((line) => `<tr><td>${esc(BET_LABEL[line.type])}</td><td>${esc(line.number)}</td><td>${formatNumber(line.amount)} บาท</td></tr>`)).join("");
    popup.document.write(`<html><head><title>สรุปบิลรวม</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#172033}h1{font-size:22px}p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}td:last-child,th:last-child{text-align:right}.total{margin-top:20px;text-align:right;font-size:18px;font-weight:bold}</style></head><body><h1>สรุปบิลรวมลูกค้าหลัก</h1><p>${esc(first.collector)} · งวด ${esc(formatDate(first.period?.drawDate ?? "-"))}</p><p>จำนวนบิล ${rows.length} · ยอดก่อนลด ${formatNumber(gross)} บาท · ยอดสุทธิ ${formatNumber(amount)} บาท · ค้าง ${formatNumber(outstanding)} บาท</p><table><thead><tr><th>ประเภท</th><th>เลข</th><th>ยอดแทง</th></tr></thead><tbody>${lines}</tbody></table><div class="total">ยอดสุทธิรวม ${formatNumber(amount)} บาท</div></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }
  return <div className="p-4"><div className="flex items-start justify-between gap-2"><div><h2 className="font-semibold text-slate-900">สรุปรวมกลุ่ม</h2><p className="mt-1 text-sm text-slate-500">{first.collector} · งวด {formatDate(first.period?.drawDate ?? "-")}</p></div><Button variant="outline" size="sm" onClick={printGroup}><Printer className="size-4" /> พิมพ์สรุปรวม</Button></div><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>จำนวนบิล</dt><dd>{formatNumber(rows.length)}</dd></div><div className="flex justify-between"><dt>ยอดก่อนลด</dt><dd>{formatNumber(gross)} บาท</dd></div><div className="flex justify-between font-semibold text-blue-700"><dt>ยอดสุทธิ</dt><dd>{formatNumber(amount)} บาท</dd></div><div className="flex justify-between text-orange-700"><dt>ค้างชำระ</dt><dd>{outstanding ? `${formatNumber(outstanding)} บาท` : "-"}</dd></div></dl><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-xs font-semibold text-slate-500">บิลในกลุ่ม</p>{rows.map((row) => <div key={row.bill.id} className="mt-2 flex justify-between text-xs"><span>{row.bill.no} · {row.customer}</span><span>{formatNumber(row.bill.amount)} บาท</span></div>)}</div><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-xs font-semibold text-slate-500">รายการเลขที่ซื้อ</p><div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">{rows.flatMap((row) => row.bill.lines.map((line, index) => <div key={row.bill.id + "-line-" + index} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1.5 text-xs"><span><strong>{BET_LABEL[line.type]}</strong> · {line.number}</span><span className="tabular-nums">{formatNumber(line.amount)} บาท</span></div>))}</div></div></div>;
}
