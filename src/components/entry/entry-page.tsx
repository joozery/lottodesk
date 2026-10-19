"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeftRight, Keyboard, Layers3, Pencil, Plus, Printer, Search, Trash2, Upload } from "@/components/icons";
import { LotteryFilter } from "@/components/dealers/lottery-filter";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-panels";
import { useRemote } from "@/hooks/use-remote";
import { formatDate, formatNumber } from "@/lib/format";
import type { Customer, Lottery, Period } from "@/lib/types";
import { fetchDealers, fetchPeriods } from "@/services/mock-service";

type EntryType = "2" | "3" | "run";
type EntryRow = { id: string; number: string; type: EntryType; top: number; tod: number; bottom: number };
type SheetMap = Record<string, EntryRow[]>;

const STORAGE_KEY = "lottodesk.entry-sheets.v1";
const CUSTOMERS_KEY = "lottodesk.entry-customers.v1";
const initialRows: EntryRow[] = ["785", "758", "875", "857", "578", "587"].map((number, i) => ({
  id: `sample-${i}`, number, type: "3", top: 500, tod: 500, bottom: 0,
}));
const initialSheets: SheetMap = { "thai|th-1101|d-bank|c-a|cus-002|3": initialRows };
const money = (n: number) => `฿${formatNumber(n)}`;
const rowTotal = (row: EntryRow) => row.top + row.tod + row.bottom;
const sheetKey = (lottery: Lottery, periodId: string, dealerId: string, collectorId: string, customerId: string, sheet: number) =>
  [lottery, periodId, dealerId, collectorId, customerId, sheet].join("|");

function amountsFor(rows: EntryRow[]) {
  return rows.reduce((totals, row) => ({
    top: totals.top + row.top,
    tod: totals.tod + row.tod,
    bottom: totals.bottom + row.bottom,
    total: totals.total + rowTotal(row),
  }), { top: 0, tod: 0, bottom: 0, total: 0 });
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function preferredPeriod(periods: Period[], lottery: Lottery) {
  const choices = periods.filter((p) => p.lottery === lottery).sort((a, b) => a.drawDate.localeCompare(b.drawDate));
  return choices.find((p) => p.status === "pending" && p.drawDate >= localDate()) ?? choices.at(-1);
}

function parseImportedRows(content: string): EntryRow[] {
  return content.split(/\r?\n/).slice(0, 300).map((line, i) => {
    const [number, top, tod, bottom] = line.trim().split(/[\t,;]/).map((part) => part.trim());
    if (!/^\d+$/.test(number ?? "")) return null;
    const parsed = { top: Number(top || 0), tod: Number(tod || 0), bottom: Number(bottom || 0) };
    if (Object.values(parsed).some((n) => !Number.isFinite(n) || n < 0) || Object.values(parsed).every((n) => n === 0)) return null;
    const inferred: EntryType = number.length === 1 ? "run" : number.length === 2 ? "2" : "3";
    if (number.length !== Number(inferred === "run" ? 1 : inferred)) return null;
    const amounts = { ...parsed, tod: inferred === "3" ? parsed.tod : 0 };
    if (Object.values(amounts).every((n) => n === 0)) return null;
    return { id: `import-${Date.now()}-${i}`, number, type: inferred, ...amounts };
  }).filter((row): row is EntryRow => row !== null);
}

export function EntryPage() {
  const [nonce, setNonce] = useState(0);
  const dealersRemote = useRemote(`entry-dealers-${nonce}`, fetchDealers);
  const periodsRemote = useRemote(`entry-periods-${nonce}`, fetchPeriods);
  const dealers = dealersRemote.data ?? [];
  const periods = periodsRemote.data ?? [];

  const [lottery, setLottery] = useState<Lottery>("thai");
  const [periodChoice, setPeriodChoice] = useState<string | null>(null);
  const [dealerChoice, setDealerChoice] = useState("d-bank");
  const [collectorChoice, setCollectorChoice] = useState("c-a");
  const [customerChoice, setCustomerChoice] = useState("cus-002");
  const [sheet, setSheet] = useState(3);
  const [search, setSearch] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("3");
  const [number, setNumber] = useState("");
  const [top, setTop] = useState("500");
  const [tod, setTod] = useState("500");
  const [bottom, setBottom] = useState("");
  const [reverse, setReverse] = useState(false);
  const [lockAmount, setLockAmount] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [extraCustomers, setExtraCustomers] = useState<Record<string, Customer[]>>({});
  const [sheets, setSheets] = useState<SheetMap>(initialSheets);
  const [savedSheets, setSavedSheets] = useState<SheetMap>(initialSheets);
  const fileRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLInputElement>(null);
  const todRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SheetMap;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            setSheets(parsed);
            setSavedSheets(parsed);
          }
        }
        const storedCustomers = localStorage.getItem(CUSTOMERS_KEY);
        if (storedCustomers) setExtraCustomers(JSON.parse(storedCustomers) as Record<string, Customer[]>);
      } catch {
        setNotice("อ่านแผ่นที่บันทึกในเบราว์เซอร์ไม่สำเร็จ");
      }
    });
    return () => { active = false; };
  }, []);

  const dealer = dealers.find((d) => d.id === dealerChoice) ?? dealers[0];
  const collector = dealer?.collectors.find((c) => c.id === collectorChoice) ?? dealer?.collectors[0];
  const customers = [...(collector?.customers ?? []), ...(extraCustomers[collector?.id ?? ""] ?? [])];
  const customer = customers.find((c) => c.id === customerChoice) ?? customers[0];
  const periodOptions = periods.filter((p) => p.lottery === lottery).sort((a, b) => b.drawDate.localeCompare(a.drawDate));
  const period = periodOptions.find((p) => p.id === periodChoice) ?? preferredPeriod(periods, lottery);
  const open = !!period && period.status === "pending" && period.drawDate >= localDate();
  const prefix = [lottery, period?.id ?? "", dealer?.id ?? "", collector?.id ?? "", customer?.id ?? ""].join("|");
  const key = sheetKey(lottery, period?.id ?? "", dealer?.id ?? "", collector?.id ?? "", customer?.id ?? "", sheet);
  const rows = sheets[key] ?? [];
  const totals = amountsFor(rows);
  const allRows = Object.entries(sheets).filter(([k]) => k.startsWith(`${prefix}|`)).flatMap(([, value]) => value);
  const allTotals = amountsFor(allRows);
  const sheetNumbers = Array.from(new Set([1, 2, 3, ...Object.keys(sheets).filter((k) => k.startsWith(`${prefix}|`)).map((k) => Number(k.split("|").at(-1)))]))
    .filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
  const dirty = JSON.stringify(sheets) !== JSON.stringify(savedSheets);

  function updateRows(next: EntryRow[]) {
    setSheets((current) => ({ ...current, [key]: next }));
    setNotice("");
  }

  function clearEntry(clearAmounts = false) {
    setNumber("");
    setEditingId(null);
    if (clearAmounts) { setTop(""); setTod(""); setBottom(""); }
    numberRef.current?.focus();
  }

  function addEntry(event: FormEvent) {
    event.preventDefault();
    if (!open) { setNotice("งวดนี้ปิดรับแล้ว กรุณาเลือกงวดที่เปิดรับ"); return; }
    const digits = entryType === "run" ? 1 : Number(entryType);
    if (!new RegExp(`^\\d{${digits}}$`).test(number)) { setNotice(`กรุณากรอกเลข ${digits} หลัก`); numberRef.current?.focus(); return; }
    const amounts = { top: Number(top || 0), tod: entryType === "3" ? Number(tod || 0) : 0, bottom: Number(bottom || 0) };
    if (Object.values(amounts).some((n) => !Number.isFinite(n) || n < 0) || Object.values(amounts).every((n) => n === 0)) {
      setNotice("กรุณากรอกยอดเงินที่มากกว่า 0"); return;
    }
    const nextRow: EntryRow = { id: editingId ?? `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, number, type: entryType, ...amounts };
    const next = editingId ? rows.map((row) => row.id === editingId ? nextRow : row) : [...rows, nextRow];
    if (reverse && !editingId) {
      const reversed = number.split("").reverse().join("");
      if (reversed !== number) next.push({ ...nextRow, id: `entry-${Date.now()}-reverse`, number: reversed });
    }
    updateRows(next);
    clearEntry(!lockAmount);
  }

  function editRow(row: EntryRow) {
    setEditingId(row.id);
    setEntryType(row.type);
    setNumber(row.number);
    setTop(row.top ? String(row.top) : "");
    setTod(row.tod ? String(row.tod) : "");
    setBottom(row.bottom ? String(row.bottom) : "");
    numberRef.current?.focus();
  }

  function saveSheet() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
      setSavedSheets(sheets);
      setNotice(`บันทึกแผ่นที่ ${sheet} ในเบราว์เซอร์นี้แล้ว`);
    } catch {
      setNotice("บันทึกไม่สำเร็จ กรุณาตรวจพื้นที่จัดเก็บในเบราว์เซอร์");
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const imported = parseImportedRows(await file.text());
    if (!imported.length) { setNotice("ไม่พบรายการที่นำเข้าได้ ใช้คอลัมน์ เลข,บน,โต๊ด,ล่าง"); return; }
    updateRows([...rows, ...imported]);
    setNotice(`นำเข้า ${formatNumber(imported.length)} รายการแล้ว กรุณาตรวจสอบและบันทึกแผ่น`);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleShortcut(key: string) {
    const shortcuts: Record<string, { type: EntryType; field: "top" | "tod" | "bottom" }> = {
      F1: { type: "2", field: "top" },
      F2: { type: "3", field: "top" },
      F3: { type: "2", field: "bottom" },
      F4: { type: "3", field: "bottom" },
      F5: { type: "3", field: "tod" },
      F6: { type: "run", field: "top" },
      F7: { type: "run", field: "bottom" },
    };
    const shortcut = shortcuts[key];
    if (!shortcut) return false;
    setEntryType(shortcut.type);
    setNumber("");
    queueMicrotask(() => {
      const target = shortcut.field === "top" ? topRef : shortcut.field === "tod" ? todRef : bottomRef;
      target.current?.focus();
    });
    return true;
  }

  const categories = [
    ["2 บน", (row: EntryRow) => row.type === "2" ? row.top : 0],
    ["3 บน", (row: EntryRow) => row.type === "3" ? row.top : 0],
    ["2 ล่าง", (row: EntryRow) => row.type === "2" ? row.bottom : 0],
    ["3 ล่าง", (row: EntryRow) => row.type === "3" ? row.bottom : 0],
    ["2 โต๊ด", (row: EntryRow) => row.type === "2" ? row.tod : 0],
    ["3 โต๊ด", (row: EntryRow) => row.type === "3" ? row.tod : 0],
    ["วิ่งบน", (row: EntryRow) => row.type === "run" ? row.top : 0],
    ["วิ่งล่าง", (row: EntryRow) => row.type === "run" ? row.bottom : 0],
  ] as const;

  return (
    <>
      <TopBar breadcrumb={["คีย์โพยด่วน"]} />
      <main className="mx-auto w-full max-w-[1700px] flex-1 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3"><h1 className="text-xl font-bold text-[#102356]">คีย์โพยด่วน</h1><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">ข้อมูลตัวอย่าง</span></div>
            <p className="mt-0.5 text-xs text-slate-500">เลือกงวดและลูกค้า แล้วคีย์รายการลงแผ่นโพย</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LotteryFilter value={lottery} onChange={(value) => { if (value !== "all") { setLottery(value); setPeriodChoice(null); } }} includeAll={false} />
            <Select value={period?.id ?? ""} onValueChange={setPeriodChoice}>
              <SelectTrigger className="w-44" aria-label="งวดหวย" />
              <SelectContent>{periodOptions.map((p) => <SelectItem key={p.id} value={p.id}>{formatDate(p.drawDate)}{p.status === "confirmed" ? " · ยืนยันผลแล้ว" : ""}</SelectItem>)}</SelectContent>
            </Select>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><span className={`mr-1.5 inline-block size-2 rounded-full ${open ? "bg-emerald-500" : "bg-slate-400"}`} />{open ? "เปิดรับ" : "ปิดรับ"}</span>
          </div>
        </div>

        {dealersRemote.error || periodsRemote.error ? <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลคีย์โพยไม่สำเร็จ</ErrorState> : !dealer || !collector || !period ? <Skeleton className="h-[660px] rounded-xl" /> : (
          <>
            <div className="mb-3 grid grid-cols-2 items-end gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:flex sm:flex-wrap sm:gap-3">
              <label className="min-w-40 flex-1 text-xs font-medium text-slate-500">เจ้ามือ
                <Select value={dealer.id} onValueChange={(id) => { setDealerChoice(id); const next = dealers.find((d) => d.id === id); setCollectorChoice(next?.collectors[0]?.id ?? ""); setCustomerChoice(next?.collectors[0]?.customers[0]?.id ?? ""); setSheet(1); }}>
                  <SelectTrigger className="mt-1" aria-label="เจ้ามือ" />
                  <SelectContent>{dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <label className="min-w-40 flex-1 text-xs font-medium text-slate-500">ผู้ส่งโพย
                <Select value={collector.id} onValueChange={(id) => { setCollectorChoice(id); setCustomerChoice(dealer.collectors.find((c) => c.id === id)?.customers[0]?.id ?? ""); setSheet(1); }}>
                  <SelectTrigger className="mt-1" aria-label="ผู้ส่งโพย" />
                  <SelectContent>{dealer.collectors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <label className="min-w-44 flex-1 text-xs font-medium text-slate-500">ลูกค้า
                <Select value={customer?.id ?? ""} onValueChange={(id) => { setCustomerChoice(id); setSheet(1); }}>
                  <SelectTrigger className="mt-1" aria-label="ลูกค้า" />
                  <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <label className="text-xs font-medium text-slate-500 sm:w-28">แผ่นที่
                <Select value={String(sheet)} onValueChange={(value) => setSheet(Number(value))}>
                  <SelectTrigger className="mt-1" aria-label="แผ่นที่" />
                  <SelectContent>{sheetNumbers.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </label>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_260px]">
              <aside className="min-w-0 space-y-3 max-lg:order-2">
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between"><h2 className="font-bold text-[#102356]">ลูกค้า</h2><Button size="icon" className="size-8" aria-label="เพิ่มลูกค้า" onClick={() => setAddingCustomer((v) => !v)}><Plus className="size-4" /></Button></div>
                  {addingCustomer && <form onSubmit={(e) => { e.preventDefault(); if (!newCustomer.trim()) return; const id = `local-${Date.now()}`; const next = { id, code: `NEW-${String((extraCustomers[collector.id] ?? []).length + 1).padStart(2, "0")}`, name: newCustomer.trim() }; const updated = { ...extraCustomers, [collector.id]: [...(extraCustomers[collector.id] ?? []), next] }; try { localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updated)); setExtraCustomers(updated); setCustomerChoice(id); setNewCustomer(""); setAddingCustomer(false); setSheet(1); } catch { setNotice("เพิ่มลูกค้าไม่สำเร็จ กรุณาตรวจพื้นที่จัดเก็บในเบราว์เซอร์"); } }} className="mb-3 flex gap-1.5"><Input value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="ชื่อลูกค้า" aria-label="ชื่อลูกค้าใหม่" /><Button type="submit" size="sm">เพิ่ม</Button></form>}
                  <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="รหัส / ชื่อลูกค้า" aria-label="ค้นหาลูกค้า" className="pl-9" /></label>
                  <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                    <div className="grid grid-cols-[70px_1fr] bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500"><span>รหัส</span><span>ชื่อลูกค้า</span></div>
                    {customers.filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase())).map((c) => <button key={c.id} type="button" onClick={() => { setCustomerChoice(c.id); setSheet(1); }} className={`grid w-full grid-cols-[70px_1fr] border-t border-slate-100 px-3 py-1.5 text-left text-sm ${c.id === customer?.id ? "bg-blue-600 font-semibold text-white" : "text-slate-700 hover:bg-blue-50"}`}><span>{c.code}</span><span className="truncate">{c.name}</span></button>)}
                  </div>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <h2 className="font-bold text-[#102356]">แผ่นโพย</h2><p className="mt-0.5 text-xs text-slate-500">ลูกค้าเดียวมีหลายแผ่นได้</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">{sheetNumbers.map((n) => <button key={n} type="button" onClick={() => setSheet(n)} className={`size-8 rounded-lg border text-sm font-semibold ${n === sheet ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-700 hover:border-blue-300"}`}>{n}</button>)}<button type="button" onClick={() => setSheet(Math.max(...sheetNumbers) + 1)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 px-2 text-sm font-medium text-blue-600"><Plus className="size-3.5" /> เพิ่มแผ่น</button></div>
                </section>
              </aside>

              <div className="min-w-0 space-y-3 max-lg:order-1">
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5"><div className="flex items-center gap-2"><h2 className="text-base font-bold text-blue-700">แผ่นที่ {sheet}</h2><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{formatNumber(rows.length)} รายการ</span></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => updateRows(rows.map((row) => ({ ...row, number: row.number.split("").reverse().join("") })))} disabled={!rows.length || !open}><ArrowLeftRight className="size-4" /> กลับเลข</Button><input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void importFile(e.target.files?.[0])} /><Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={!open}><Upload className="size-4" /> นำเข้า</Button><Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /> พิมพ์บิล</Button></div></div>
                  <div className="max-h-[46vh] overflow-auto"><table className="w-full text-center text-sm"><thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-1.5 py-1.5">ลำดับ</th><th className="px-1.5 py-1.5">เลข</th><th className="px-1.5 py-1.5">บน</th><th className="px-1.5 py-1.5">โต๊ด</th><th className="px-1.5 py-1.5">ล่าง</th><th className="px-1.5 py-1.5">รวม</th><th className="px-1.5 py-1.5">จัดการ</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, i) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-1.5 py-1.5 text-slate-500">{i + 1}</td><td className="px-1.5 py-1.5 text-[15px] font-bold text-[#102356]">{row.number}</td><td className="px-1.5 py-1.5 tabular-nums">{row.top ? formatNumber(row.top) : "—"}</td><td className="px-1.5 py-1.5 tabular-nums">{row.tod ? formatNumber(row.tod) : "—"}</td><td className="px-1.5 py-1.5 tabular-nums">{row.bottom ? formatNumber(row.bottom) : "—"}</td><td className="px-1.5 py-1.5 font-bold tabular-nums text-blue-700">{formatNumber(rowTotal(row))}</td><td className="px-1 py-0.5"><div className="flex justify-center"><button type="button" aria-label={`แก้ไขเลข ${row.number}`} onClick={() => editRow(row)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50 max-md:p-2.5"><Pencil className="size-4" /></button><button type="button" aria-label={`ลบเลข ${row.number}`} onClick={() => updateRows(rows.filter((item) => item.id !== row.id))} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 max-md:p-2.5"><Trash2 className="size-4" /></button></div></td></tr>)}<tr className="bg-blue-50/30"><td className="px-1.5 py-1.5 text-slate-500">{rows.length + 1}</td><td colSpan={6} className="px-1.5 py-1.5 text-left text-xs text-slate-400">เพิ่มรายการใหม่ในช่องคีย์ด้านล่าง</td></tr></tbody></table></div>
                  <div className="grid gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-sm sm:grid-cols-[auto_1fr_1fr_1fr]"><span className="font-semibold">{formatNumber(rows.length)} รายการ</span><span>บน <strong className="ml-2 text-blue-700">{money(totals.top)}</strong></span><span>โต๊ด <strong className="ml-2 text-blue-700">{money(totals.tod)}</strong></span><span>ล่าง <strong className="ml-2 text-blue-700">{money(totals.bottom)}</strong></span></div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold text-[#102356]">คีย์รายการด่วน</h2><div className="flex items-center gap-1 rounded-full border border-slate-200 p-0.5">{(["2", "3", "run"] as const).map((type) => <button key={type} type="button" onClick={() => { setEntryType(type); clearEntry(); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${entryType === type ? "bg-blue-600 text-white" : "text-slate-600"}`}>{type === "run" ? "วิ่ง" : `${type} ตัว`}</button>)}</div></div>
                  <form onSubmit={addEntry} onKeyDown={(e) => { if (handleShortcut(e.key)) e.preventDefault(); if (e.key === "Escape") { e.preventDefault(); clearEntry(); } }} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(80px,1.2fr)_repeat(3,minmax(65px,0.8fr))_auto]">
                    <label className="text-xs font-medium text-slate-600">เลข<Input ref={numberRef} value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} maxLength={entryType === "run" ? 1 : Number(entryType)} inputMode="numeric" autoComplete="off" className="mt-1 h-9 font-mono text-lg" aria-label="เลข" /></label>
                    <label className="text-xs font-medium text-slate-600">บน<Input ref={topRef} value={top} onChange={(e) => setTop(e.target.value)} type="number" min="0" inputMode="numeric" className="mt-1" aria-label="บน" /></label>
                    <label className="text-xs font-medium text-slate-600">โต๊ด<Input ref={todRef} value={tod} onChange={(e) => setTod(e.target.value)} type="number" min="0" inputMode="numeric" disabled={entryType !== "3"} className="mt-1" aria-label="โต๊ด" /></label>
                    <label className="text-xs font-medium text-slate-600">ล่าง<Input ref={bottomRef} value={bottom} onChange={(e) => setBottom(e.target.value)} type="number" min="0" inputMode="numeric" className="mt-1" aria-label="ล่าง" /></label>
                    <Button type="submit" disabled={!open} className="col-span-2 sm:col-span-1"><Plus className="size-4" /> {editingId ? "อัปเดตรายการ" : "เพิ่มรายการ"}</Button>
                  </form>
                  <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-600"><label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} className="accent-blue-600" /> กลับเลข</label><label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={lockAmount} onChange={(e) => setLockAmount(e.target.checked)} className="accent-blue-600" /> ล็อกยอดเงิน</label><span className="ml-auto text-slate-400">Enter เพิ่มรายการ · Tab ช่องถัดไป · Esc ล้างช่อง</span></div>
                </section>
                <div className="flex items-center justify-end gap-2 max-xl:sticky max-xl:bottom-[calc(4.25rem+env(safe-area-inset-bottom))] max-xl:z-20 max-xl:-mx-3 max-xl:border-t max-xl:border-slate-200 max-xl:bg-white/95 max-xl:px-3 max-xl:py-2 max-xl:backdrop-blur"><Button variant="outline" onClick={() => { setSheets(savedSheets); clearEntry(); setNotice("ยกเลิกการแก้ไขที่ยังไม่บันทึกแล้ว"); }} disabled={!dirty} className="max-xl:flex-1">ยกเลิก</Button><Button onClick={saveSheet} disabled={!dirty} className="max-xl:flex-[2]"><Layers3 className="size-4" /> บันทึกแผ่น {money(totals.total)}</Button></div>
                {notice && <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</p>}
              </div>

              <aside className="min-w-0 space-y-3 max-lg:order-3 lg:col-start-2 xl:col-start-3 xl:row-start-1">
                <section className="rounded-xl bg-gradient-to-br from-[#152b50] to-[#0a1832] p-3.5 text-white shadow-sm"><div className="flex items-center justify-between text-sm"><h2 className="font-semibold">ยอดแผ่นนี้</h2><span>{formatNumber(rows.length)} รายการ</span></div><p className="mt-2 text-3xl font-bold tabular-nums">{money(totals.total)}</p></section>
                <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"><h2 className="mb-2 font-bold text-[#102356]">สรุปยอด</h2><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="px-2 py-1.5 text-left">ประเภท</th><th className="px-2 py-1.5 text-right">แผ่นนี้</th><th className="px-2 py-1.5 text-right">ลูกค้านี้</th></tr></thead><tbody>{categories.map(([label, getAmount]) => { const here = rows.reduce((sum, row) => sum + getAmount(row), 0); const all = allRows.reduce((sum, row) => sum + getAmount(row), 0); return <tr key={label} className="border-b border-slate-100"><th className="px-2 py-1 text-left text-[13px] font-medium">{label}</th><td className={`px-2 py-1 text-right tabular-nums ${here ? "" : "text-slate-300"}`}>{formatNumber(here)}</td><td className={`px-2 py-1 text-right tabular-nums ${all ? "" : "text-slate-300"}`}>{formatNumber(all)}</td></tr>; })}</tbody><tfoot className="bg-blue-50 font-bold text-blue-700"><tr><td className="px-2 py-1.5">รวม</td><td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(totals.total)}</td><td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(allTotals.total)}</td></tr></tfoot></table></section>
                <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-[#102356]"><Keyboard className="size-4" /> คำสั่งลัด</h2><div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">{[["F1", "2 บน"], ["F2", "3 บน"], ["F3", "2 ล่าง"], ["F4", "3 ล่าง"], ["F5", "3 โต๊ด"], ["F6", "วิ่งบน"], ["F7", "วิ่งล่าง"]].map(([key, label]) => <div key={key} className="flex items-center gap-2"><kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono">{key}</kbd><span className="text-slate-600">{label}</span></div>)}</div></section>
              </aside>
            </div>
            <p className="mt-3 text-right text-xs text-slate-400">ข้อมูลตัวอย่าง · แผ่นที่บันทึกเก็บในเบราว์เซอร์นี้</p>
          </>
        )}
      </main>
    </>
  );
}
