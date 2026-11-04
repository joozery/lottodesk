import { Fragment, useState } from "react";
import { EmptyState } from "@/components/ui/state-panels";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "@/components/icons";
import { formatDate, formatNumber, lotteryLabel } from "@/lib/format";
import type { BillView } from "@/lib/bills";
import { BET_LABEL, linePrize, RATES } from "@/lib/prize-calc";
import { useRemote } from "@/hooks/use-remote";
import { fetchPrizeResult } from "@/services/results-service";

function discountPercentForLine(row: BillView, type: BillView["bill"]["lines"][number]["type"], runDiscountPercent: number) {
  const isRun = type === "runTop" || type === "runBottom";
  return isRun
    ? runDiscountPercent
    : row.bill.specialNumberDiscountPercent ?? row.bill.discountPercent ?? 0;
}

export function GroupedBillList({ rows, filtered, onSelectGroup }: { rows: BillView[] | null; filtered: boolean; onSelectGroup?: (rows: BillView[]) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!rows) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">กำลังโหลด...</div>;
  if (!rows.length) return <div className="rounded-xl border border-slate-200 bg-white"><EmptyState title={filtered ? "ไม่พบกลุ่มบิลที่ตรงกับตัวกรอง" : "ไม่มีบิลในช่วงที่เลือก"} hint="ลองขยายช่วงวันที่ หรือล้างตัวกรอง" /></div>;
  const groups = new Map<string, { collector: string; period: string; lottery: BillView["bill"]["lottery"]; count: number; customers: Set<string>; gross: number; amount: number; prize: number; outstanding: number; bills: BillView[] }>();
  for (const row of rows) {
    const key = `${row.bill.collectorId}|${row.bill.periodId}`;
    const group = groups.get(key) ?? { collector: row.collector, period: row.period?.drawDate ?? "-", lottery: row.bill.lottery, count: 0, customers: new Set<string>(), gross: 0, amount: 0, prize: 0, outstanding: 0, bills: [] };
    group.count += 1;
    group.customers.add(row.customer);
    group.gross += row.bill.grossAmount ?? row.bill.amount;
    group.amount += row.bill.amount;
    group.prize += row.bill.prize;
    group.outstanding += row.bill.outstanding;
    group.bills.push(row);
    groups.set(key, group);
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-3.5"><div className="mb-2 text-xs text-slate-500">กดแถวเพื่อดูสรุปด้านขวาและกางบิลทั้งหมดในกลุ่ม</div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="bg-slate-50 text-left text-slate-600"><th className="rounded-l-lg px-3 py-2.5 font-medium">ลูกค้าหลัก / งวด</th><th className="px-3 py-2.5 font-medium">ประเภทหวย</th><th className="px-3 py-2.5 text-right font-medium">จำนวนบิล</th><th className="px-3 py-2.5 text-right font-medium">ยอดก่อนลด</th><th className="px-3 py-2.5 text-right font-medium">ยอดสุทธิ</th><th className="px-3 py-2.5 text-right font-medium">ยอดจ่าย</th><th className="rounded-r-lg px-3 py-2.5 text-right font-medium">ค้างชำระ</th></tr></thead><tbody>{[...groups.entries()].map(([key, group]) => <Fragment key={key}><tr className="cursor-pointer border-b border-slate-100 hover:bg-blue-50" onClick={() => { onSelectGroup?.(group.bills); setExpanded((current) => current === key ? null : key); }}><td className="px-3 py-3"><p className="font-medium text-slate-900">{expanded === key ? "▼ " : "▶ "}{group.collector}</p><p className="text-xs text-slate-500">งวด {formatDate(group.period)} · {group.customers.size} ลูกค้าย่อย</p></td><td className="px-3 py-3">{lotteryLabel[group.lottery]}</td><td className="px-3 py-3 text-right tabular-nums">{formatNumber(group.count)}</td><td className="px-3 py-3 text-right tabular-nums">{formatNumber(group.gross)} บาท</td><td className="px-3 py-3 text-right font-medium tabular-nums">{formatNumber(group.amount)} บาท</td><td className="px-3 py-3 text-right font-medium tabular-nums text-emerald-700">{group.prize ? `${formatNumber(group.prize)} บาท` : "-"}</td><td className="px-3 py-3 text-right tabular-nums">{group.outstanding ? `${formatNumber(group.outstanding)} บาท` : "-"}</td></tr>{expanded === key && group.bills.map((row) => <tr key={row.bill.id} className="border-b border-slate-100 bg-slate-50 text-xs"><td className="py-2 pl-8 pr-3">{row.bill.no} · {row.customer}</td><td className="px-3 py-2">{lotteryLabel[row.bill.lottery]}</td><td className="px-3 py-2 text-right">1 บิล</td><td className="px-3 py-2 text-right">{formatNumber(row.bill.grossAmount ?? row.bill.amount)} บาท</td><td className="px-3 py-2 text-right">{formatNumber(row.bill.amount)} บาท</td><td className="px-3 py-2 text-right text-emerald-700">{row.bill.prize ? `${formatNumber(row.bill.prize)} บาท` : "-"}</td><td className="px-3 py-2 text-right">{row.bill.outstanding ? `${formatNumber(row.bill.outstanding)} บาท` : "-"}</td></tr>)}</Fragment>)}</tbody></table></div></section>;
}

export function GroupedBillDetail({ rows, runDiscountPercent = 0 }: { rows: BillView[]; runDiscountPercent?: number }) {
  const first = rows[0];
  const prizeResult = useRemote(`group-prize-${first?.bill.periodId ?? "none"}`, first ? () => fetchPrizeResult(first.bill.periodId) : null);
  if (!first) return null;
  const gross = rows.reduce((sum, row) => sum + (row.bill.grossAmount ?? row.bill.amount), 0);
  const amount = rows.reduce((sum, row) => sum + row.bill.amount, 0);
  const outstanding = rows.reduce((sum, row) => sum + row.bill.outstanding, 0);
  const discountAmount = Math.max(0, Math.round((gross - amount) * 100) / 100);
  const discountTotals = rows.reduce((totals, row) => {
    row.bill.lines.forEach((line) => {
      const isRun = line.type === "runTop" || line.type === "runBottom";
      const percent = discountPercentForLine(row, line.type, runDiscountPercent);
      const key = isRun ? "run" : "number";
      totals[key].gross += line.amount;
      totals[key].discount += line.amount * percent / 100;
    });
    return totals;
  }, { number: { gross: 0, discount: 0 }, run: { gross: 0, discount: 0 } });
  const numberDiscountPercent = discountTotals.number.gross > 0 ? Math.round((discountTotals.number.discount / discountTotals.number.gross) * 10000) / 100 : 0;
  const runDiscountPercentShown = discountTotals.run.gross > 0 ? Math.round((discountTotals.run.discount / discountTotals.run.gross) * 10000) / 100 : runDiscountPercent;
  const winners = prizeResult.data ? [...rows.reduce((map, row) => {
    row.bill.lines.forEach((line) => {
      const rates = { ...RATES, ...(row.bill.rates ?? {}), ...(row.bill.rateOverrides?.[line.number] ?? {}) };
      const payout = linePrize(line, row.bill.lottery, prizeResult.data!, rates);
      const rate = rates[line.type];
      if (payout <= 0 || !rate) return;
      const key = `${line.type}:${line.number}:${rate}`;
      const current = map.get(key) ?? { number: line.number, type: BET_LABEL[line.type], amount: 0, rate, payout: 0 };
      current.amount += line.amount;
      current.payout += payout;
      map.set(key, current);
    });
    return map;
  }, new Map<string, { number: string; type: string; amount: number; rate: number; payout: number }>()).values()] : [];
  function printGroup() {
    downloadGroup("print");
    /*
    const popup = window.open("", "_blank", "width=800,height=900");
    if (!popup) return;
    const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
    const prize = rows.reduce((sum, row) => sum + row.bill.prize, 0);
    const order = ["top3", "tod3", "top2", "bottom2", "runTop", "runBottom", "bottom3"] as const;
    const totals = new Map<string, { gross: number; net: number }>();
    rows.forEach((row) => row.bill.lines.forEach((line) => {
      const current = totals.get(line.type) ?? { gross: 0, net: 0 };
      const discount = line.type === "runTop" || line.type === "runBottom" ? row.bill.specialRunDiscountPercent ?? row.bill.discountPercent ?? 0 : row.bill.specialNumberDiscountPercent ?? row.bill.discountPercent ?? 0;
      current.gross += line.amount;
      current.net += line.amount * (100 - discount) / 100;
      totals.set(line.type, current);
    }));
    const summaryRows = order.map((type) => {
      const value = totals.get(type);
      const percent = value && value.gross > 0 ? Math.round((1 - value.net / value.gross) * 10000) / 100 : 0;
      return `<tr><td>${BET_LABEL[type]}</td><td class="num">${value ? formatNumber(value.gross) : "-"}</td><td class="num">${value ? `${formatNumber(percent)}%` : "-"}</td><td class="num">${value ? formatNumber(value.net) : "-"}</td></tr>`;
    }).join("");
    const lines = rows.flatMap((row) => row.bill.lines.map((line) => `<tr><td>${esc(BET_LABEL[line.type])}</td><td>${esc(line.number)}</td><td>${formatNumber(line.amount)} บาท</td></tr>`)).join("");
    popup.document.write(`<html><head><title>สรุปบิลรวม</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#172033}h1{font-size:22px}h2{font-size:16px;margin:24px 0 8px}p{color:#64748b}.summary{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-top:18px}.summary b{color:#064b9b}.num{text-align:right}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}td:last-child,th:last-child{text-align:right}.total{margin-top:20px;text-align:right;font-size:18px;font-weight:bold}</style></head><body><h1>สรุปบิลรวมลูกค้าหลัก</h1><p>${esc(first.collector)} · งวด ${esc(formatDate(first.period?.drawDate ?? "-"))}</p><div class="summary"><div>จำนวนบิล <b>${rows.length}</b></div><div>ยอดก่อนลด <b>${formatNumber(gross)} บาท</b></div><div>ส่วนลดรวม <b>${formatNumber(discountPercent)}% (${formatNumber(discountAmount)} บาท)</b></div><div>ยอดสุทธิ <b>${formatNumber(amount)} บาท</b></div><div>ยอดจ่าย <b>${formatNumber(prize)} บาท</b></div><div>ค้างชำระ <b>${formatNumber(outstanding)} บาท</b></div></div><h2>สรุปตามประเภท</h2><table><thead><tr><th>รายการ</th><th>ยอดเต็ม</th><th>% ลด</th><th>ยอดสุทธิ</th></tr></thead><tbody>${summaryRows}</tbody></table><h2>รายการเลขที่ซื้อ</h2><table><thead><tr><th>ประเภท</th><th>เลข</th><th>ยอดแทง</th></tr></thead><tbody>${lines}</tbody></table><div class="total">ยอดสุทธิรวม ${formatNumber(amount)} บาท · ยอดจ่าย ${formatNumber(prize)} บาท</div></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }
    */
  }
  function downloadGroup(mode: "download" | "print" | unknown = "download") {
    const prize = rows.reduce((sum, row) => sum + row.bill.prize, 0);
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0b4a91";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(28, 28, 1344, 844);
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, 1344, 844);
    ctx.fillStyle = "#172033";
    ctx.font = "700 22px Arial";
    ctx.fillText(`วันที่ ${formatDate(first.period?.drawDate ?? "-")}`, 70, 120);
    ctx.fillText(`ชื่อ ${first.collector}`, 420, 120);
    ctx.fillText(`จำนวน ${rows.length} ใบ`, 950, 120);
    ctx.fillStyle = "#064b9b";
    ctx.fillRect(70, 190, 1100, 62);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 22px Arial";
    ["รายการ", "ยอดเต็ม", "%", "เก็บเต็ม"].forEach((label, index) => ctx.fillText(label, [95, 590, 850, 1010][index], 230));
    const order = ["top3", "tod3", "top2", "bottom2", "runTop", "runBottom", "bottom3"] as const;
    const totals = new Map<string, { gross: number; net: number }>();
    rows.forEach((row) => row.bill.lines.forEach((line) => {
      const current = totals.get(line.type) ?? { gross: 0, net: 0 };
      current.gross += line.amount;
      current.net += line.amount * (100 - discountPercentForLine(row, line.type, runDiscountPercent)) / 100;
      totals.set(line.type, current);
    }));
    ctx.font = "700 22px Arial";
    order.forEach((type, index) => {
      const value = totals.get(type);
      const y = 252 + index * 58;
      ctx.fillStyle = index % 2 ? "#dbeafe" : "#ffffff";
      ctx.fillRect(70, y, 1100, 58);
      ctx.fillStyle = "#111827";
      ctx.fillText(BET_LABEL[type], 95, y + 37);
      ctx.fillText(value ? formatNumber(value.gross) : "-", 590, y + 37);
      ctx.fillText(value ? `${formatNumber(Math.round((1 - value.net / value.gross) * 10000) / 100)}%` : "-", 850, y + 37);
      ctx.fillText(value ? formatNumber(value.net) : "-", 1010, y + 37);
    });
    ctx.fillStyle = "#172033";
    ctx.font = "700 22px Arial";
    ctx.fillText(`รวมยอดเต็ม ${formatNumber(gross)} บาท`, 70, 760);
    ctx.fillText(`ส่วนลดเลข ${formatNumber(numberDiscountPercent)}% (${formatNumber(discountTotals.number.discount)} บาท)`, 70, 785);
    ctx.fillText(`ส่วนลดวิ่ง ${formatNumber(runDiscountPercentShown)}% (${formatNumber(discountTotals.run.discount)} บาท) · ยอดสุทธิ ${formatNumber(amount)} บาท`, 70, 810);
    ctx.fillStyle = "#172033";
    ctx.fillText(`ยอดจ่ายรางวัล ${formatNumber(prize)} บาท`, 70, 835);
    if (winners.length > 0) {
      ctx.fillStyle = "#172033";
      ctx.font = "700 22px Arial";
      ctx.fillText("ถูกรางวัล", 70, 680);
      ctx.font = "700 22px Arial";
      winners.slice(0, 6).forEach((winner, index) => {
        const column = index < 3 ? 70 : 690;
        const row = index % 3;
        ctx.fillText(`${winner.type} ${winner.number} | ${formatNumber(winner.amount)} × ${formatNumber(winner.rate)} = ${formatNumber(winner.payout)}`, column, 705 + row * 22);
      });
    }
    if (mode === "print") {
      const popup = window.open("", "_blank", "width=1400,height=900");
      if (!popup) return;
      popup.document.write(`<html><head><title>สรุปลูกค้าหลัก</title><style>html,body{margin:0;padding:0;background:#0b4a91}img{display:block;width:100%;height:auto}</style></head><body><img src="${canvas.toDataURL("image/png")}" alt="สรุปลูกค้าหลัก" /></body></html>`);
      popup.document.close();
      popup.focus();
      popup.onload = () => popup.print();
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `สรุปลูกค้าหลัก-${first.collector}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, "image/png");
  }
  return <div className="p-4"><div className="flex items-start justify-between gap-2"><div><h2 className="font-semibold text-slate-900">สรุปรวมกลุ่ม</h2><p className="mt-1 text-sm text-slate-500">{first.collector} · งวด {formatDate(first.period?.drawDate ?? "-")}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={downloadGroup}><Download className="size-4" /> โหลดรูป</Button><Button variant="outline" size="sm" onClick={printGroup}><Printer className="size-4" /> พิมพ์สรุปรวม</Button></div></div><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>จำนวนบิล</dt><dd>{formatNumber(rows.length)}</dd></div><div className="flex justify-between"><dt>ยอดก่อนลด</dt><dd>{formatNumber(gross)} บาท</dd></div><div className="flex justify-between font-semibold text-emerald-700"><dt>ส่วนลดเลข</dt><dd>{formatNumber(numberDiscountPercent)}% · {formatNumber(discountTotals.number.discount)} บาท</dd></div><div className="flex justify-between font-semibold text-emerald-700"><dt>ส่วนลดวิ่ง</dt><dd>{formatNumber(runDiscountPercentShown)}% · {formatNumber(discountTotals.run.discount)} บาท</dd></div><div className="flex justify-between font-semibold text-emerald-700"><dt>ส่วนลดรวม</dt><dd>{formatNumber(discountAmount)} บาท</dd></div><div className="flex justify-between font-semibold text-blue-700"><dt>ยอดสุทธิ</dt><dd>{formatNumber(amount)} บาท</dd></div><div className="flex justify-between text-orange-700"><dt>ค้างชำระ</dt><dd>{outstanding ? `${formatNumber(outstanding)} บาท` : "-"}</dd></div></dl><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-xs font-semibold text-slate-500">บิลในกลุ่ม</p>{rows.map((row) => <div key={row.bill.id} className="mt-2 flex justify-between text-xs"><span>{row.bill.no} · {row.customer}</span><span>{formatNumber(row.bill.amount)} บาท</span></div>)}</div><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-xs font-semibold text-slate-500">รายการเลขที่ซื้อ</p><div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">{rows.flatMap((row) => row.bill.lines.map((line, index) => <div key={row.bill.id + "-line-" + index} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1.5 text-xs"><span><strong>{BET_LABEL[line.type]}</strong> · {line.number}</span><span className="tabular-nums">{formatNumber(line.amount)} บาท</span></div>))}</div></div></div>;
}

